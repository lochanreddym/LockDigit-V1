import { internalMutation, internalQuery, query } from "./_generated/server";
import { jsonLog, requireCurrentUser } from "./authHelpers";

const WEBHOOK_LAG_ALERT_MS = parseInt(
  process.env.ALERT_WEBHOOK_LAG_MS || `${5 * 60 * 1000}`,
  10
);
const PENDING_TXN_ALERT_MS = parseInt(
  process.env.ALERT_PENDING_TXN_AGE_MS || `${30 * 60 * 1000}`,
  10
);
const PIN_FAILURE_SPIKE_THRESHOLD = parseInt(
  process.env.ALERT_PIN_FAILURE_SPIKE_THRESHOLD || "20",
  10
);
const ALERT_COOLDOWN_MS = parseInt(
  process.env.ALERT_COOLDOWN_MS || `${30 * 60 * 1000}`,
  10
);

async function emitOperationalAlert(
  ctx: any,
  args: {
    action: string;
    severity: "high" | "critical";
    details: Record<string, unknown>;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("auditLogs")
    .withIndex("by_action_created", (q: any) =>
      q.eq("action", args.action).gte("createdAt", now - ALERT_COOLDOWN_MS)
    )
    .take(1);

  if (existing.length > 0) return false;

  await ctx.db.insert("auditLogs", {
    action: args.action,
    targetType: "ops_alert",
    details: {
      severity: args.severity,
      ...args.details,
    },
    createdAt: now,
  });

  jsonLog("ops.alert", {
    action: args.action,
    severity: args.severity,
    ...args.details,
  });

  return true;
}

async function collectWebhookWindowStats(
  ctx: any,
  args: { from: number; now: number }
) {
  const baseQuery = ctx.db
    .query("webhookEvents")
    .withIndex("by_received_at", (q: any) => q.gte("receivedAt", args.from));

  const countFn = (baseQuery as any)?.count;
  let totalEvents = 0;
  if (typeof countFn === "function") {
    totalEvents = await countFn.call(baseQuery);
  }

  let failedCount = 0;
  let laggedCount = 0;
  let maxLagMs = 0;
  let scanned = 0;
  let capped = false;

  const paginated = (baseQuery as any)?.order?.("desc");
  const paginateFn = paginated?.paginate;
  if (typeof paginateFn === "function") {
    const PAGE_SIZE = 200;
    const MAX_SCANNED = 10_000;
    let cursor: string | null = null;
    for (;;) {
      const page: any = await paginateFn.call(paginated, {
        cursor,
        numItems: PAGE_SIZE,
      });

      for (const event of page.page as any[]) {
        scanned += 1;
        if (event.status === "failed") failedCount += 1;
        if (
          event.status !== "processed" &&
          args.now - event.receivedAt > WEBHOOK_LAG_ALERT_MS
        ) {
          laggedCount += 1;
          maxLagMs = Math.max(maxLagMs, args.now - event.receivedAt);
        }
      }

      if (scanned >= MAX_SCANNED && !page.isDone) {
        capped = true;
        break;
      }
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
  } else {
    // Backward-compatible fallback for runtimes without paginate support.
    const fallback = await baseQuery.take(500);
    scanned = fallback.length;
    for (const event of fallback) {
      if (event.status === "failed") failedCount += 1;
      if (
        event.status !== "processed" &&
        args.now - event.receivedAt > WEBHOOK_LAG_ALERT_MS
      ) {
        laggedCount += 1;
        maxLagMs = Math.max(maxLagMs, args.now - event.receivedAt);
      }
    }
    capped = scanned >= 500 || (totalEvents > 0 && totalEvents > scanned);
  }

  if (totalEvents === 0) {
    totalEvents = scanned;
  }

  return {
    recentEvents: totalEvents,
    failedCount,
    laggedCount,
    maxLagMs,
    capped,
  };
}

async function collectHealthSnapshot(ctx: any) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const fifteenMinutesAgo = now - 15 * 60 * 1000;

  const webhookWindow = await collectWebhookWindowStats(ctx, {
    from: oneHourAgo,
    now,
  });

  const stalePendingTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_status_created_at", (q: any) =>
      q
        .eq("status", "pending")
        .lte("createdAt", now - PENDING_TXN_ALERT_MS)
    )
    .take(500);

  const recentPinFailures = await ctx.db
    .query("auditLogs")
    .withIndex("by_action_created", (q: any) =>
      q
        .eq("action", "user.pin.failed_attempt")
        .gte("createdAt", fifteenMinutesAgo)
    )
    .take(500);

  return {
    generatedAt: now,
    webhook: {
      recentEvents: webhookWindow.recentEvents,
      failedCount: webhookWindow.failedCount,
      laggedCount: webhookWindow.laggedCount,
      maxLagMs: webhookWindow.maxLagMs,
      capped: webhookWindow.capped,
    },
    payments: {
      stalePendingCount: stalePendingTransactions.length,
      staleThresholdMs: PENDING_TXN_ALERT_MS,
    },
    auth: {
      pinFailuresLast15m: recentPinFailures.length,
      spikeThreshold: PIN_FAILURE_SPIKE_THRESHOLD,
    },
  };
}

export const getAlertSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) ?? [];
    const normalizedUserEmail = user.email?.trim().toLowerCase();
    const isAdmin = normalizedUserEmail
      ? adminEmails.includes(normalizedUserEmail)
      : false;
    if (!isAdmin) {
      throw new Error("Forbidden: admin access required for alert snapshot");
    }
    return await collectHealthSnapshot(ctx);
  },
});

export const getAlertSnapshotInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await collectHealthSnapshot(ctx);
  },
});

export const evaluateAlertsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const snapshot = await collectHealthSnapshot(ctx);

    let emitted = 0;

    if (snapshot.webhook.laggedCount > 0) {
      const ok = await emitOperationalAlert(ctx, {
        action: "ops.alert.webhook_lag",
        severity: "critical",
        details: {
          laggedCount: snapshot.webhook.laggedCount,
          maxLagMs: snapshot.webhook.maxLagMs,
          thresholdMs: WEBHOOK_LAG_ALERT_MS,
        },
      });
      if (ok) emitted += 1;
    }

    if (snapshot.webhook.failedCount > 0) {
      const ok = await emitOperationalAlert(ctx, {
        action: "ops.alert.webhook_failures",
        severity: "high",
        details: {
          failedCount: snapshot.webhook.failedCount,
          window: "1h",
        },
      });
      if (ok) emitted += 1;
    }

    if (snapshot.payments.stalePendingCount > 0) {
      const ok = await emitOperationalAlert(ctx, {
        action: "ops.alert.pending_payment_backlog",
        severity: "high",
        details: {
          stalePendingCount: snapshot.payments.stalePendingCount,
          thresholdMs: snapshot.payments.staleThresholdMs,
        },
      });
      if (ok) emitted += 1;
    }

    if (snapshot.auth.pinFailuresLast15m >= PIN_FAILURE_SPIKE_THRESHOLD) {
      const ok = await emitOperationalAlert(ctx, {
        action: "ops.alert.pin_failure_spike",
        severity: "high",
        details: {
          pinFailuresLast15m: snapshot.auth.pinFailuresLast15m,
          threshold: snapshot.auth.spikeThreshold,
        },
      });
      if (ok) emitted += 1;
    }

    return {
      checkedAt: snapshot.generatedAt,
      emittedAlerts: emitted,
      snapshot,
    };
  },
});
