import { internalMutation } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * ONE_DAY_MS;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const CRON_SCAN_LIMIT = 500;

async function insertNotificationIfMissing(
  ctx: any,
  args: {
    userId: any;
    title: string;
    body: string;
    type: "bill_due" | "doc_expiry" | "payment_success" | "subsidy" | "system";
    relatedId?: string;
    dedupeKey: string;
    now: number;
  }
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_user_dedupe", (q: any) =>
      q.eq("userId", args.userId).eq("dedupeKey", args.dedupeKey)
    )
    .first();

  if (existing) return false;

  await ctx.db.insert("notifications", {
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    read: false,
    relatedId: args.relatedId,
    dedupeKey: args.dedupeKey,
    createdAt: args.now,
  });
  return true;
}

export const checkOverdueBills = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const candidates = await ctx.db
      .query("bills")
      .withIndex("by_due_date", (q) => q.lte("dueDate", now))
      .take(CRON_SCAN_LIMIT);

    let updatedCount = 0;

    for (const bill of candidates) {
      if (bill.status !== "pending") continue;

      await ctx.db.patch(bill._id, { status: "overdue" });
      await insertNotificationIfMissing(ctx, {
        userId: bill.userId,
        title: "Bill Overdue",
        body: `Your bill "${bill.title}" of $${(bill.amount / 100).toFixed(2)} is now overdue.`,
        type: "bill_due",
        relatedId: bill._id,
        dedupeKey: `bill_overdue:${bill._id}`,
        now,
      });
      updatedCount += 1;
    }

    return { scanned: candidates.length, updated: updatedCount };
  },
});

export const checkExpiringDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + THIRTY_DAYS_MS;
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_expiry_date", (q) => q.gte("expiryDate", now).lte("expiryDate", horizon))
      .take(CRON_SCAN_LIMIT);

    let notifiedCount = 0;

    for (const doc of docs) {
      if (!doc.expiryDate || doc.expiryDate <= now) continue;

      const timeUntilExpiry = doc.expiryDate - now;
      let bucket: "1d" | "7d" | "30d" | null = null;
      let message = "";

      if (timeUntilExpiry <= ONE_DAY_MS) {
        bucket = "1d";
        message = `Your ${doc.title} expires tomorrow! Renew it as soon as possible.`;
      } else if (timeUntilExpiry <= SEVEN_DAYS_MS) {
        bucket = "7d";
        const days = Math.ceil(timeUntilExpiry / ONE_DAY_MS);
        message = `Your ${doc.title} expires in ${days} days. Consider renewing it soon.`;
      } else if (timeUntilExpiry <= THIRTY_DAYS_MS) {
        bucket = "30d";
        const days = Math.ceil(timeUntilExpiry / ONE_DAY_MS);
        message = `Your ${doc.title} will expire in ${days} days.`;
      }

      if (!bucket) continue;

      const inserted = await insertNotificationIfMissing(ctx, {
        userId: doc.userId,
        title: "Document Expiring Soon",
        body: message,
        type: "doc_expiry",
        relatedId: doc._id,
        dedupeKey: `doc_expiry:${doc._id}:${bucket}`,
        now,
      });

      if (inserted) notifiedCount += 1;
    }

    return { scanned: docs.length, notified: notifiedCount };
  },
});

export const sendBillReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const reminderHorizon = now + THREE_DAYS_MS;

    const candidates = await ctx.db
      .query("bills")
      .withIndex("by_due_date", (q) => q.gte("dueDate", now).lte("dueDate", reminderHorizon))
      .take(CRON_SCAN_LIMIT);

    let remindersSent = 0;

    for (const bill of candidates) {
      if (bill.status !== "pending") continue;

      const timeUntilDue = bill.dueDate - now;
      if (timeUntilDue <= 0 || timeUntilDue > THREE_DAYS_MS) continue;

      const days = Math.ceil(timeUntilDue / ONE_DAY_MS);
      const inserted = await insertNotificationIfMissing(ctx, {
        userId: bill.userId,
        title: "Bill Payment Reminder",
        body: `"${bill.title}" of $${(bill.amount / 100).toFixed(2)} is due in ${days} day${days === 1 ? "" : "s"}.`,
        type: "bill_due",
        relatedId: bill._id,
        dedupeKey: `bill_due:${bill._id}:${days}d`,
        now,
      });

      if (inserted) remindersSent += 1;
    }

    return { scanned: candidates.length, remindersSent };
  },
});
