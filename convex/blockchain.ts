import { v } from "convex/values";
import { ethers } from "ethers";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { jsonLog, requireCurrentUserFromAction } from "./authHelpers";

const internalApi = internal as any;
const parsedTxWaitTimeoutMs = Number.parseInt(
  process.env.BLOCKCHAIN_TX_WAIT_TIMEOUT_MS ?? "",
  10
);
const BLOCKCHAIN_TX_WAIT_TIMEOUT_MS =
  Number.isFinite(parsedTxWaitTimeoutMs) && parsedTxWaitTimeoutMs > 0
    ? parsedTxWaitTimeoutMs
    : 60_000;
const BLOCKCHAIN_ANCHOR_GAS_LIMIT = 100_000n;

function normalize256BitHash(hash: string): string {
  const normalized = hash.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("contentHash must be a 64-character hex string");
  }
  return normalized;
}

function isAnchoringEnabled() {
  return process.env.FEATURE_BLOCKCHAIN_ANCHORING === "true";
}

function nextBackoffMs(attempts: number) {
  const base = 60_000; // 1 min
  const max = 60 * 60 * 1000; // 1 hr
  return Math.min(max, base * Math.max(1, attempts) * Math.max(1, attempts));
}

async function claimNextAnchorJob(
  ctx: any,
  status: "pending" | "failed",
  now: number
) {
  const candidate = await ctx.db
    .query("anchorJobs")
    .withIndex("by_status_next_attempt", (q: any) =>
      q.eq("status", status).lte("nextAttemptAt", now)
    )
    .take(1);

  const job = candidate[0];
  if (!job) return null;
  if (job.status !== status || job.nextAttemptAt > now) return null;

  const attempts = (job.attempts ?? 0) + 1;
  await ctx.db.patch(job._id, {
    status: "processing",
    attempts,
    updatedAt: Date.now(),
  });

  return {
    ...job,
    status: "processing" as const,
    attempts,
  };
}

export const enqueueAnchorJobInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    contentHash: v.string(),
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("anchorJobs")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("anchorJobs", {
      documentId: args.documentId,
      contentHash: args.contentHash,
      dedupeKey: args.dedupeKey,
      status: "pending",
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const processPendingAnchorJobs = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    if (!isAnchoringEnabled()) {
      return { processed: false, reason: "feature_flag_disabled" };
    }

    const now = Date.now();
    const job: any = await ctx.runMutation(
      internalApi.blockchain.getAndClaimNextAnchorJobInternal,
      {
        now,
      }
    );
    if (!job) {
      return { processed: false, reason: "no_job" };
    }

    const rpcUrl = process.env.POLYGON_RPC_URL;
    const privateKey = process.env.POLYGON_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      await ctx.runMutation(internalApi.blockchain.markAnchorJobFailedInternal, {
        jobId: job._id,
        error: "POLYGON_RPC_URL and POLYGON_PRIVATE_KEY are not configured.",
      });
      return { processed: false, reason: "missing_polygon_config" };
    }

    try {
      const payloadHash = normalize256BitHash(job.contentHash);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(
        privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
        provider
      );

      const feeData = await provider.getFeeData();
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0n,
        data: `0x${payloadHash}`,
        gasLimit: BLOCKCHAIN_ANCHOR_GAS_LIMIT,
        ...(feeData.maxFeePerGas
          ? { maxFeePerGas: feeData.maxFeePerGas }
          : feeData.gasPrice
            ? { gasPrice: feeData.gasPrice }
            : {}),
        ...(feeData.maxPriorityFeePerGas
          ? { maxPriorityFeePerGas: feeData.maxPriorityFeePerGas }
          : {}),
      });

      let receipt;
      try {
        receipt = await tx.wait(1, BLOCKCHAIN_TX_WAIT_TIMEOUT_MS);
      } catch (waitErr) {
        const msg =
          waitErr instanceof Error ? waitErr.message : "transaction confirmation timeout";
        throw new Error(
          `Blockchain anchor transaction timed out after ${BLOCKCHAIN_TX_WAIT_TIMEOUT_MS}ms: ${msg}`
        );
      }
      if (!receipt || receipt.status !== 1) {
        throw new Error("Blockchain anchor transaction was not mined successfully");
      }

      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();

      await ctx.runMutation(internal.documents.setBlockchainAnchor, {
        documentId: job.documentId,
        blockchainTxHash: tx.hash,
        blockchainChainId: chainId,
        blockchainAnchoredAt: Date.now(),
      });

      await ctx.runMutation(internalApi.blockchain.markAnchorJobSucceededInternal, {
        jobId: job._id,
        txHash: tx.hash,
        chainId,
      });

      jsonLog("blockchain.anchor.succeeded", {
        documentId: job.documentId,
        txHash: tx.hash,
        chainId,
      });

      return { processed: true, jobId: job._id, txHash: tx.hash, chainId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Anchor failed";
      await ctx.runMutation(internalApi.blockchain.markAnchorJobFailedInternal, {
        jobId: job._id,
        error: message,
      });

      jsonLog("blockchain.anchor.failed", {
        jobId: job._id,
        error: message,
      });

      return { processed: false, jobId: job._id, reason: message };
    }
  },
});

export const getAndClaimNextAnchorJobInternal = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const pending = await claimNextAnchorJob(ctx, "pending", args.now);
    if (pending) return pending;
    return await claimNextAnchorJob(ctx, "failed", args.now);
  },
});

export const getNextAnchorJobInternal = internalQuery({
  args: {
    status: v.union(v.literal("pending"), v.literal("failed")),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("anchorJobs")
      .withIndex("by_status_next_attempt", (q) =>
        q.eq("status", args.status).lte("nextAttemptAt", args.now)
      )
      .take(1);

    return jobs[0] ?? null;
  },
});

export const markAnchorJobProcessingInternal = internalMutation({
  args: { jobId: v.id("anchorJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    await ctx.db.patch(args.jobId, {
      status: "processing",
      attempts: (job.attempts ?? 0) + 1,
      updatedAt: Date.now(),
    });
  },
});

export const markAnchorJobSucceededInternal = internalMutation({
  args: {
    jobId: v.id("anchorJobs"),
    txHash: v.string(),
    chainId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    await ctx.db.patch(args.jobId, {
      status: "succeeded",
      txHash: args.txHash,
      chainId: args.chainId,
      updatedAt: Date.now(),
    });
  },
});

export const markAnchorJobFailedInternal = internalMutation({
  args: {
    jobId: v.id("anchorJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const attempts = job.attempts ?? 1;

    await ctx.db.patch(args.jobId, {
      status: "failed",
      lastError: args.error,
      nextAttemptAt: Date.now() + nextBackoffMs(attempts),
      updatedAt: Date.now(),
    });
  },
});

export const anchorDocumentHash = action({
  args: {
    documentId: v.id("documents"),
    contentHash: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const { user } = await requireCurrentUserFromAction(ctx);
    if (!isAnchoringEnabled()) {
      return {
        anchored: false,
        queued: false,
        reason: "Blockchain anchoring is disabled for this beta environment.",
      };
    }

    const doc = await ctx.runQuery(internal.documents.getByIdInternal, {
      documentId: args.documentId,
    });
    if (!doc) {
      throw new Error("Document not found");
    }
    if (doc.userId !== user._id) {
      throw new Error("Forbidden: document does not belong to you");
    }

    const normalizedHash = normalize256BitHash(args.contentHash);
    const dedupeKey = `document:${args.documentId}:${normalizedHash}`;

    const jobId: any = await ctx.runMutation(internalApi.blockchain.enqueueAnchorJobInternal, {
      documentId: args.documentId,
      contentHash: normalizedHash,
      dedupeKey,
    });

    // Fire-and-forget attempt for faster completion; cron will retry on failure.
    void ctx.runAction(internalApi.blockchain.processPendingAnchorJobs, {});

    return {
      anchored: false,
      queued: true,
      jobId,
      reason: "Anchor job queued for asynchronous processing.",
    };
  },
});

export const anchorVerificationEvent = action({
  args: {
    documentId: v.id("documents"),
    fingerprint: v.string(),
    verificationLevel: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    const { user } = await requireCurrentUserFromAction(ctx);
    if (!isAnchoringEnabled()) {
      return { anchored: false, reason: "Blockchain anchoring is disabled" };
    }

    const doc = await ctx.runQuery(internal.documents.getByIdInternal, {
      documentId: args.documentId,
    });
    if (!doc) {
      throw new Error("Document not found");
    }
    if (doc.userId !== user._id) {
      throw new Error("Forbidden: document does not belong to you");
    }

    const payload = ethers.keccak256(
      ethers.toUtf8Bytes(
        JSON.stringify({
          type: "verification",
          fingerprint: args.fingerprint,
          verificationLevel: args.verificationLevel,
          expiresAt: args.expiresAt,
        })
      )
    );

    const jobId: any = await ctx.runMutation(internalApi.blockchain.enqueueAnchorJobInternal, {
      documentId: args.documentId,
      contentHash: normalize256BitHash(payload),
      dedupeKey: `verification:${args.documentId}:${args.fingerprint}:${args.expiresAt}`,
    });

    void ctx.runAction(internalApi.blockchain.processPendingAnchorJobs, {});

    return {
      anchored: false,
      queued: true,
      jobId,
      reason: "Verification anchor job queued.",
    };
  },
});
