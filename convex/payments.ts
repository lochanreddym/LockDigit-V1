import { hmac } from "@noble/hashes/hmac.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes } from "@noble/hashes/utils.js";
import { v } from "convex/values";
import {
  action,
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertResourceOwner,
  assertUserAccess,
  jsonLog,
  nowDayUtcRange,
  requireCurrentUser,
  requireCurrentUserFromAction,
  writeAuditLog,
} from "./authHelpers";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_PAYMENT_LIMIT_CENTS = 250_000;
const PAYMENT_PIN_KDF = "pbkdf2-sha256";
const PAYMENT_PIN_DEFAULT_ITERATIONS = 210_000;
const PAYMENT_PIN_DERIVED_KEY_LENGTH = 32;
const PAYMENT_PIN_MAX_ATTEMPTS = 5;
const PAYMENT_PIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toUtf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function sha256Hex(input: string): string {
  return toHex(sha256(toUtf8Bytes(input)));
}

function hashPaymentPinLegacy(pin: string, salt: string): string {
  return sha256Hex(`${salt}:${pin}`);
}

function hashPaymentPin(
  pin: string,
  salt: string,
  iterations = PAYMENT_PIN_DEFAULT_ITERATIONS
): string {
  return toHex(
    pbkdf2(sha256, toUtf8Bytes(pin), toUtf8Bytes(salt), {
      c: iterations,
      dkLen: PAYMENT_PIN_DERIVED_KEY_LENGTH,
    })
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function generatePaymentToken(): string {
  const ts = Date.now().toString();
  const rand = toHex(randomBytes(6)).toUpperCase();
  return `T${ts}${rand}`;
}

function generateVerificationToken(): string {
  return `V${toHex(randomBytes(16)).toUpperCase()}`;
}

function generatePostingId(): string {
  return `P${Date.now()}${toHex(randomBytes(8)).toUpperCase()}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function mapStripeStatusToPaymentState(status: string): {
  paymentState: Doc<"transactions">["paymentState"];
  status: Doc<"transactions">["status"];
} {
  switch (status) {
    case "succeeded":
      return { paymentState: "succeeded", status: "completed" };
    case "processing":
      return { paymentState: "processing", status: "pending" };
    case "requires_action":
      return { paymentState: "requires_action", status: "pending" };
    case "requires_confirmation":
      return { paymentState: "created", status: "pending" };
    case "requires_payment_method":
      return { paymentState: "failed", status: "failed" };
    case "canceled":
      return { paymentState: "cancelled", status: "failed" };
    default:
      return { paymentState: "processing", status: "pending" };
  }
}

function parseStripeSignatureHeader(signatureHeader: string) {
  const values = Object.fromEntries(
    signatureHeader
      .split(",")
      .map((part) => part.trim().split("="))
      .filter((parts) => parts.length === 2)
  );

  return {
    timestamp: values.t,
    signature: values.v1,
  };
}

const STRIPE_SIGNATURE_TOLERANCE_SEC = 300;

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const { timestamp, signature } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(ts - nowSec) > STRIPE_SIGNATURE_TOLERANCE_SEC) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = toHex(
    hmac(sha256, toUtf8Bytes(secret), toUtf8Bytes(signedPayload))
  );

  return timingSafeEqual(expected, signature);
}

async function getOrCreateLedgerAccount(
  ctx: Parameters<typeof internalMutation>[0] extends never
    ? never
    : any,
  args: {
    userId?: Id<"users">;
    accountCode: string;
    currency: string;
    kind: "asset" | "liability" | "equity" | "revenue" | "expense";
  }
): Promise<Id<"ledgerAccounts">> {
  if (args.userId) {
    const existing = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_user_code", (q: any) =>
        q.eq("userId", args.userId).eq("accountCode", args.accountCode)
      )
      .first();
    if (existing) return existing._id;
  } else {
    const existing = await ctx.db
      .query("ledgerAccounts")
      .withIndex("by_code", (q: any) => q.eq("accountCode", args.accountCode))
      .first();
    if (existing) return existing._id;
  }

  return await ctx.db.insert("ledgerAccounts", {
    userId: args.userId,
    accountCode: args.accountCode,
    currency: args.currency,
    kind: args.kind,
    createdAt: Date.now(),
  });
}

async function postPaymentLedgerEntries(
  ctx: Parameters<typeof internalMutation>[0] extends never
    ? never
    : any,
  tx: Doc<"transactions">
) {
  const existing = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_transaction", (q: any) => q.eq("transactionId", tx._id))
    .first();

  if (existing) {
    return;
  }

  const postingId = generatePostingId();
  const userSpendAccountId = await getOrCreateLedgerAccount(ctx, {
    userId: tx.userId,
    accountCode: `user:${tx.userId}:spend`,
    currency: "usd",
    kind: "expense",
  });

  const platformSettlementAccountId = await getOrCreateLedgerAccount(ctx, {
    accountCode: "platform:settlement",
    currency: "usd",
    kind: "liability",
  });

  await ctx.db.insert("ledgerEntries", {
    postingId,
    transactionId: tx._id,
    userId: tx.userId,
    accountId: userSpendAccountId,
    side: "debit",
    amount: tx.amount,
    currency: "usd",
    entryType: "payment_spend",
    createdAt: Date.now(),
  });

  await ctx.db.insert("ledgerEntries", {
    postingId,
    transactionId: tx._id,
    userId: tx.userId,
    accountId: platformSettlementAccountId,
    side: "credit",
    amount: tx.amount,
    currency: "usd",
    entryType: "payment_settlement",
    createdAt: Date.now(),
  });
}

export const getIdempotencyRecordInternal = internalQuery({
  args: {
    userId: v.id("users"),
    operation: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_user_operation_key", (q) =>
        q.eq("userId", args.userId)
          .eq("operation", args.operation)
          .eq("key", args.key)
      )
      .first();

    if (!record) return null;
    if (record.expiresAt < Date.now()) return null;
    return record;
  },
});

export const putIdempotencyRecordInternal = internalMutation({
  args: {
    userId: v.id("users"),
    operation: v.string(),
    key: v.string(),
    requestHash: v.string(),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_user_operation_key", (q) =>
        q.eq("userId", args.userId)
          .eq("operation", args.operation)
          .eq("key", args.key)
      )
      .first();

    const payload = {
      userId: args.userId,
      operation: args.operation,
      key: args.key,
      requestHash: args.requestHash,
      response: args.response,
      createdAt: Date.now(),
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("idempotencyKeys", payload);
  },
});

export const createTransactionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("payment"),
      v.literal("scan_to_pay"),
      v.literal("bill_payment"),
      v.literal("transfer"),
      v.literal("wire_transfer")
    ),
    amount: v.number(),
    merchantName: v.optional(v.string()),
    description: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    paymentToken: v.string(),
    recipientPhone: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      status: "pending",
      paymentState: "created",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const applyPaymentIntentStateInternal = internalMutation({
  args: {
    transactionId: v.id("transactions"),
    paymentState: v.union(
      v.literal("created"),
      v.literal("requires_action"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) {
      return { applied: false, reason: "transaction_not_found" as const };
    }

    const mapped = mapStripeStatusToPaymentState(args.paymentState ?? "processing");

    const patch: Partial<Doc<"transactions">> = {
      paymentState: args.paymentState,
      status: mapped.status,
      updatedAt: Date.now(),
    };

    if (args.stripePaymentIntentId) {
      patch.stripePaymentIntentId = args.stripePaymentIntentId;
    }
    if (args.stripeChargeId) {
      patch.stripeChargeId = args.stripeChargeId;
    }

    if (mapped.status === "completed") {
      if (!tx.completedAt) {
        patch.completedAt = Date.now();
      }
      if (!tx.verificationToken) {
        patch.verificationToken = generateVerificationToken();
      }
      if (args.paymentMethod) {
        patch.paymentMethod = args.paymentMethod;
      }
    }

    await ctx.db.patch(tx._id, patch);

    const updatedTx = { ...tx, ...patch } as Doc<"transactions">;

    if (updatedTx.status === "completed") {
      await postPaymentLedgerEntries(ctx, updatedTx);

      const existingNotif = await ctx.db
        .query("notifications")
        .withIndex("by_user_dedupe", (q) =>
          q
            .eq("userId", updatedTx.userId)
            .eq("dedupeKey", `payment_success:${updatedTx._id}`)
        )
        .first();

      if (!existingNotif) {
        await ctx.db.insert("notifications", {
          userId: updatedTx.userId,
          title: "Payment Successful",
          body: `Payment of $${(updatedTx.amount / 100).toFixed(2)} completed successfully.`,
          type: "payment_success",
          read: false,
          relatedId: updatedTx._id,
          dedupeKey: `payment_success:${updatedTx._id}`,
          createdAt: Date.now(),
        });
      }
    }

    return { applied: true, status: updatedTx.status, paymentState: updatedTx.paymentState };
  },
});

export const getTransactionByPaymentIntentInternal = internalQuery({
  args: { stripePaymentIntentId: v.string() },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .collect();

    return transactions[0] ?? null;
  },
});

export const getTransactionByIdInternal = internalQuery({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

export const getCompletedSpendForDayInternal = internalQuery({
  args: {
    userId: v.id("users"),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_created_at", (q) =>
        q.eq("userId", args.userId).gte("createdAt", args.start).lte("createdAt", args.end)
      )
      .collect();

    return transactions
      .filter((tx) => tx.status === "completed")
      .reduce((sum, tx) => sum + tx.amount, 0);
  },
});

export const processStripeWebhookInternal = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    paymentIntentId: v.optional(v.string()),
    paymentState: v.optional(
      v.union(
        v.literal("created"),
        v.literal("requires_action"),
        v.literal("processing"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    stripeChargeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", "stripe").eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      return { deduped: true };
    }

    const webhookEventId = await ctx.db.insert("webhookEvents", {
      provider: "stripe",
      eventId: args.eventId,
      eventType: args.eventType,
      payloadHash: args.payloadHash,
      status: "processing",
      receivedAt: Date.now(),
    });

    try {
      if (args.paymentIntentId && args.paymentState) {
        const tx = await ctx.db
          .query("transactions")
          .withIndex("by_payment_intent", (q) =>
            q.eq("stripePaymentIntentId", args.paymentIntentId!)
          )
          .first();

        if (tx) {
          await ctx.runMutation(internal.payments.applyPaymentIntentStateInternal, {
            transactionId: tx._id,
            paymentState: args.paymentState,
            stripePaymentIntentId: args.paymentIntentId,
            stripeChargeId: args.stripeChargeId,
          });
        }
      }

      await ctx.db.patch(webhookEventId, {
        status: "processed",
        processedAt: Date.now(),
      });

      return { deduped: false, processed: true };
    } catch (error) {
      await ctx.db.patch(webhookEventId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Webhook processing failed",
        processedAt: Date.now(),
      });
      throw error;
    }
  },
});

export const createTransaction: any = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("payment"),
      v.literal("scan_to_pay"),
      v.literal("bill_payment"),
      v.literal("transfer"),
      v.literal("wire_transfer")
    ),
    amount: v.number(),
    merchantName: v.optional(v.string()),
    description: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    paymentToken: v.string(),
    recipientPhone: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden transaction create");

    return await ctx.runMutation(internal.payments.createTransactionInternal, {
      ...args,
      userId: user._id,
    });
  },
});

export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    throw new Error(
      "Deprecated endpoint. Payment completion is webhook-authoritative; use payments.getStatus or payments.waitForTerminalStatus."
    );
  },
});

export const getTransactionsByUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden transactions read");

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getRecentTransactions = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden transactions read");

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

export const getRecentTransferContacts = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden contacts read");

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    const seen = new Set<string>();
    const contacts: {
      phone: string;
      name: string;
      lastTransferAt: number;
    }[] = [];

    for (const tx of transactions) {
      if (tx.recipientPhone && !seen.has(tx.recipientPhone)) {
        seen.add(tx.recipientPhone);
        contacts.push({
          phone: tx.recipientPhone,
          name: tx.merchantName || tx.recipientPhone,
          lastTransferAt: tx.completedAt || tx.createdAt,
        });
      }
    }

    return contacts;
  },
});

export const createPaymentIntent = action({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    description: v.string(),
    merchantName: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const { user, identity } = await requireCurrentUserFromAction(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden payment intent create");

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const requestHash = sha256Hex(
      JSON.stringify({
        amount: args.amount,
        currency: args.currency || "usd",
        description: args.description,
        merchantName: args.merchantName,
        recipientPhone: args.recipientPhone,
      })
    );

    const idempotency = await ctx.runQuery(
      internal.payments.getIdempotencyRecordInternal,
      {
        userId: user._id,
        operation: "create_payment_intent",
        key: args.idempotencyKey,
      }
    );

    if (idempotency) {
      if (idempotency.requestHash !== requestHash) {
        throw new Error("Idempotency key reused with different parameters");
      }
      return idempotency.response as {
        clientSecret: string;
        paymentIntentId: string;
        paymentToken: string;
        transactionId: Id<"transactions">;
      };
    }

    const { start, end } = nowDayUtcRange();
    const spentToday = await ctx.runQuery(
      internal.payments.getCompletedSpendForDayInternal,
      { userId: user._id, start, end }
    );

    const dailyLimit = parseInt(
      process.env.BETA_DAILY_PAYMENT_LIMIT_CENTS ||
        `${DEFAULT_DAILY_PAYMENT_LIMIT_CENTS}`,
      10
    );

    if (spentToday + args.amount > dailyLimit) {
      throw new Error("Daily payment limit reached for private beta account");
    }

    const paymentToken = generatePaymentToken();

    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `${user._id}:${args.idempotencyKey}`,
      },
      body: new URLSearchParams({
        amount: args.amount.toString(),
        currency: args.currency || "usd",
        "automatic_payment_methods[enabled]": "true",
        description: args.description,
        "metadata[userId]": user._id,
        "metadata[paymentToken]": paymentToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const paymentIntent = await response.json();
    const transactionId = await ctx.runMutation(
      internal.payments.createTransactionInternal,
      {
        userId: user._id,
        type: "payment",
        amount: args.amount,
        description: args.description,
        merchantName: args.merchantName,
        stripePaymentIntentId: paymentIntent.id,
        paymentToken,
        recipientPhone: args.recipientPhone,
        idempotencyKey: args.idempotencyKey,
      }
    );

    const result = {
      clientSecret: paymentIntent.client_secret as string,
      paymentIntentId: paymentIntent.id as string,
      paymentToken,
      transactionId,
    };

    await ctx.runMutation(internal.payments.putIdempotencyRecordInternal, {
      userId: user._id,
      operation: "create_payment_intent",
      key: args.idempotencyKey,
      requestHash,
      response: result,
    });

    jsonLog("payment_intent.created", {
      requestId: args.idempotencyKey,
      userId: user._id,
      paymentIntentId: paymentIntent.id,
      amount: args.amount,
    });

    return result;
  },
});

export const verifyAndCompletePayment = action({
  args: {
    stripePaymentIntentId: v.string(),
    paymentToken: v.string(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    await requireCurrentUserFromAction(ctx);
    throw new Error(
      "Deprecated endpoint. Payment completion is webhook-authoritative; use payments.waitForTerminalStatus."
    );
  },
});

export const getStatus = query({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const tx = await ctx.db
      .query("transactions")
      .withIndex("by_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.paymentIntentId)
      )
      .first();

    if (!tx || tx.userId !== user._id) {
      return null;
    }

    return {
      transactionId: tx._id,
      status: tx.status,
      paymentState: tx.paymentState,
      completedAt: tx.completedAt,
      verificationToken: tx.verificationToken,
    };
  },
});

type WaitForTerminalStatusResult =
  | { status: "not_found" }
  | {
      status: "pending";
      paymentState: Doc<"transactions">["paymentState"];
      transactionId: Id<"transactions">;
    }
  | {
      status: "completed" | "failed";
      paymentState: Doc<"transactions">["paymentState"];
      transactionId: Id<"transactions">;
      verificationToken?: string;
      completedAt?: number;
    };

export const waitForTerminalStatus = action({
  args: {
    paymentIntentId: v.string(),
    timeoutMs: v.optional(v.number()),
    pollIntervalMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WaitForTerminalStatusResult> => {
    const { user } = await requireCurrentUserFromAction(ctx);
    const timeoutMs = Math.min(Math.max(args.timeoutMs ?? 15_000, 1_000), 60_000);
    const pollIntervalMs = Math.min(
      Math.max(args.pollIntervalMs ?? 1_000, 250),
      5_000
    );
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const tx = (await ctx.runQuery(
        internal.payments.getTransactionByPaymentIntentInternal,
        { stripePaymentIntentId: args.paymentIntentId }
      )) as Doc<"transactions"> | null;

      if (!tx || tx.userId !== user._id) {
        return { status: "not_found" as const };
      }

      if (tx.status === "completed" || tx.status === "failed") {
        return {
          status: tx.status,
          paymentState: tx.paymentState,
          transactionId: tx._id,
          verificationToken: tx.verificationToken,
          completedAt: tx.completedAt,
        };
      }

      await sleep(pollIntervalMs);
    }

    const latest = (await ctx.runQuery(
      internal.payments.getTransactionByPaymentIntentInternal,
      { stripePaymentIntentId: args.paymentIntentId }
    )) as Doc<"transactions"> | null;

    if (!latest || latest.userId !== user._id) {
      return { status: "not_found" as const };
    }

    if (latest.status === "completed" || latest.status === "failed") {
      return {
        status: latest.status,
        paymentState: latest.paymentState,
        transactionId: latest._id,
        verificationToken: latest.verificationToken,
        completedAt: latest.completedAt,
      };
    }

    return {
      status: "pending" as const,
      paymentState: latest.paymentState,
      transactionId: latest._id,
    };
  },
});

export const getTransactionById = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) return null;

    assertResourceOwner(tx.userId, user._id, "Forbidden transaction read");
    return tx;
  },
});

export const listBankAccounts = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden accounts read");

    return await ctx.db
      .query("bankAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const addBankAccount = mutation({
  args: {
    userId: v.optional(v.id("users")),
    bankName: v.string(),
    accountLast4: v.string(),
    cardholderName: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    isDefault: v.boolean(),
    type: v.optional(v.union(v.literal("bank"), v.literal("card"))),
    expiryMonth: v.optional(v.string()),
    expiryYear: v.optional(v.string()),
    brand: v.optional(v.string()),
    paymentPin: v.optional(v.string()),
    paymentPinHash: v.optional(v.string()),
    paymentPinSalt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden account create");

    if (args.isDefault) {
      const existing = await ctx.db
        .query("bankAccounts")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      for (const account of existing) {
        if (account.isDefault) {
          await ctx.db.patch(account._id, { isDefault: false });
        }
      }
    }

    const pinPatch: Partial<Doc<"bankAccounts">> = {};
    if (args.paymentPin) {
      if (!/^(?:\d{4}|\d{6})$/.test(args.paymentPin)) {
        throw new Error("Payment PIN must be 4 or 6 digits");
      }
      const salt = toHex(randomBytes(16));
      pinPatch.paymentPinSalt = salt;
      pinPatch.paymentPinHash = hashPaymentPin(args.paymentPin, salt);
      pinPatch.paymentPinKdf = PAYMENT_PIN_KDF;
      pinPatch.paymentPinIterations = PAYMENT_PIN_DEFAULT_ITERATIONS;
      pinPatch.paymentPinFailedAttempts = 0;
      pinPatch.paymentPinLockedUntil = undefined;
    } else if (args.paymentPinHash && args.paymentPinSalt) {
      // Legacy compatibility path for clients that still submit a pre-hashed PIN.
      pinPatch.paymentPinHash = args.paymentPinHash;
      pinPatch.paymentPinSalt = args.paymentPinSalt;
      pinPatch.paymentPinKdf = "legacy-sha256";
      pinPatch.paymentPinIterations = 1;
      pinPatch.paymentPinFailedAttempts = 0;
      pinPatch.paymentPinLockedUntil = undefined;
    }

    return await ctx.db.insert("bankAccounts", {
      userId: user._id,
      bankName: args.bankName,
      accountLast4: args.accountLast4,
      cardholderName: args.cardholderName,
      stripePaymentMethodId: args.stripePaymentMethodId,
      isDefault: args.isDefault,
      type: args.type,
      expiryMonth: args.expiryMonth,
      expiryYear: args.expiryYear,
      brand: args.brand,
      ...pinPatch,
      createdAt: Date.now(),
    });
  },
});

export const verifyPaymentPin = mutation({
  args: {
    accountId: v.id("bankAccounts"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const genericFailure = {
      success: false,
      locked: false,
      remainingAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
      attemptsMade: 0,
      maxAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
    };
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== user._id) {
      return genericFailure;
    }
    if (!account.paymentPinHash || !account.paymentPinSalt) {
      return genericFailure;
    }

    const now = Date.now();
    if (account.paymentPinLockedUntil && account.paymentPinLockedUntil > now) {
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        attemptsMade: account.paymentPinFailedAttempts ?? PAYMENT_PIN_MAX_ATTEMPTS,
        maxAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
        lockedUntil: account.paymentPinLockedUntil,
      };
    }

    const isLegacy = account.paymentPinKdf !== PAYMENT_PIN_KDF;
    const expectedHash = isLegacy
      ? hashPaymentPinLegacy(args.pin, account.paymentPinSalt)
      : hashPaymentPin(
          args.pin,
          account.paymentPinSalt,
          account.paymentPinIterations ?? PAYMENT_PIN_DEFAULT_ITERATIONS
        );

    if (timingSafeEqual(expectedHash, account.paymentPinHash)) {
      const patch: Partial<Doc<"bankAccounts">> = {
        paymentPinFailedAttempts: 0,
        paymentPinLockedUntil: undefined,
      };

      // Opportunistic migration from legacy SHA-256 to PBKDF2.
      if (isLegacy) {
        const nextSalt = toHex(randomBytes(16));
        patch.paymentPinSalt = nextSalt;
        patch.paymentPinHash = hashPaymentPin(args.pin, nextSalt);
        patch.paymentPinKdf = PAYMENT_PIN_KDF;
        patch.paymentPinIterations = PAYMENT_PIN_DEFAULT_ITERATIONS;
      }

      await ctx.db.patch(account._id, patch);
      return {
        success: true,
        locked: false,
        remainingAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
        attemptsMade: 0,
        maxAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
      };
    }

    const attempts = (account.paymentPinFailedAttempts ?? 0) + 1;
    const locked = attempts >= PAYMENT_PIN_MAX_ATTEMPTS;
    const lockedUntil = locked ? now + PAYMENT_PIN_LOCK_WINDOW_MS : undefined;

    await ctx.db.patch(account._id, {
      paymentPinFailedAttempts: attempts,
      paymentPinLockedUntil: lockedUntil,
    });

    return {
      success: false,
      locked,
      remainingAttempts: Math.max(0, PAYMENT_PIN_MAX_ATTEMPTS - attempts),
      attemptsMade: attempts,
      maxAttempts: PAYMENT_PIN_MAX_ATTEMPTS,
      lockedUntil,
    };
  },
});

export const removeBankAccount = mutation({
  args: { accountId: v.id("bankAccounts") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account) return;

    assertResourceOwner(account.userId, user._id, "Forbidden account delete");
    await ctx.db.delete(args.accountId);
  },
});

export const setAccountFrozen = mutation({
  args: {
    accountId: v.id("bankAccounts"),
    frozen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Account not found");

    assertResourceOwner(account.userId, user._id, "Forbidden account update");
    await ctx.db.patch(args.accountId, { isFrozen: args.frozen });
  },
});

export const listSavedRecipients = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden recipient read");

    return await ctx.db
      .query("savedRecipients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const addSavedRecipient = mutation({
  args: {
    userId: v.optional(v.id("users")),
    recipientName: v.string(),
    accountLast4: v.string(),
    routingNumber: v.string(),
    bankName: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden recipient create");

    return await ctx.db.insert("savedRecipients", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const listInternationalRecipients = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden recipient read");

    return await ctx.db
      .query("internationalRecipients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const addInternationalRecipient = mutation({
  args: {
    userId: v.optional(v.id("users")),
    firstName: v.string(),
    lastName: v.string(),
    nickname: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    country: v.string(),
    accountLast4: v.string(),
    swiftCode: v.string(),
    bankName: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden recipient create");

    return await ctx.db.insert("internationalRecipients", {
      ...args,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const createLocalTransfer = mutation({
  args: {
    userId: v.optional(v.id("users")),
    amount: v.number(),
    description: v.string(),
    type: v.union(v.literal("transfer"), v.literal("wire_transfer")),
    merchantName: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden transfer create");

    const paymentToken = generatePaymentToken();
    const verificationToken = generateVerificationToken();

    const txId = await ctx.db.insert("transactions", {
      userId: user._id,
      type: args.type,
      amount: args.amount,
      description: args.description,
      merchantName: args.merchantName,
      paymentMethod: args.paymentMethod,
      paymentToken,
      verificationToken,
      status: "completed",
      paymentState: "succeeded",
      completedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const tx = await ctx.db.get(txId);
    if (tx) {
      await postPaymentLedgerEntries(ctx, tx);
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "payment.local_transfer.created",
      targetType: "transaction",
      targetId: txId,
      details: { amount: args.amount, type: args.type },
    });

    return { transactionId: txId, verified: true };
  },
});

export const stripeWebhook = httpAction(async (ctx, request) => {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeWebhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const payload = await request.text();
  const valid = verifyStripeSignature(payload, signatureHeader, stripeWebhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: {
    id: string;
    type: string;
    data?: {
      object?: {
        id?: string;
        status?: string;
        latest_charge?: string;
      };
    };
  };
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const acceptedTypes = ["payment_intent.succeeded", "payment_intent.payment_failed"];
  if (!acceptedTypes.includes(event.type)) {
    return new Response("ok", { status: 200 });
  }

  const paymentIntentId = event.data?.object?.id;
  const stripeStatus = event.data?.object?.status;
  const mapped = mapStripeStatusToPaymentState(stripeStatus || "processing");

  await ctx.runMutation(internal.payments.processStripeWebhookInternal, {
    eventId: event.id,
    eventType: event.type,
    payloadHash: sha256Hex(payload),
    paymentIntentId,
    paymentState: mapped.paymentState,
    stripeChargeId: event.data?.object?.latest_charge,
  });

  jsonLog("stripe.webhook.received", {
    eventId: event.id,
    eventType: event.type,
    paymentIntentId,
    paymentState: mapped.paymentState,
  });

  return new Response("ok", { status: 200 });
});

async function runReconcile(ctx: any) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  const pending = await ctx.runQuery(
    internal.payments.listPendingForReconciliationInternal,
    {}
  );

  let checked = 0;
  let updated = 0;

  for (const tx of pending) {
    if (!tx.stripePaymentIntentId) continue;
    checked += 1;

    const stripeResp = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(
        tx.stripePaymentIntentId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!stripeResp.ok) {
      continue;
    }

    const paymentIntent = await stripeResp.json();
    const mapped = mapStripeStatusToPaymentState(paymentIntent.status || "processing");

    const result = await ctx.runMutation(
      internal.payments.applyPaymentIntentStateInternal,
      {
        transactionId: tx._id,
        paymentState: mapped.paymentState ?? "processing",
        stripePaymentIntentId: tx.stripePaymentIntentId,
        stripeChargeId: paymentIntent.latest_charge ?? undefined,
      }
    );

    if (result.applied) updated += 1;
  }

  return { checked, updated };
}

export const listPendingForReconciliationInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_status_created_at", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(500);
  },
});

export const reconcileStripeTransactions = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: reconcile requires authentication");
    }
    const isAdmin =
      process.env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim())
        .includes(identity.email ?? "") ?? false;
    if (!isAdmin) {
      throw new Error("Forbidden: admin access required for reconciliation");
    }
    return await runReconcile(ctx);
  },
});

export const reconcileStripeTransactionsInternal = internalAction({
  args: {},
  handler: async (ctx) => {
    return await runReconcile(ctx);
  },
});

export const listPendingForReconciliation = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);

    // User-scoped view for debugging; reconciler action can call this for service user too.
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200)
      .then((items) => items.filter((t) => t.status === "pending"));
  },
});
