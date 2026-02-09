import { internalMutation } from "./_generated/server";

export const checkOverdueBills = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all pending bills past their due date
    const allBills = await ctx.db.query("bills").collect();
    const overdueBills = allBills.filter(
      (bill) => bill.status === "pending" && bill.dueDate < now
    );

    for (const bill of overdueBills) {
      // Mark as overdue
      await ctx.db.patch(bill._id, { status: "overdue" });

      // Create notification
      await ctx.db.insert("notifications", {
        userId: bill.userId,
        title: "Bill Overdue",
        body: `Your bill "${bill.title}" of $${(bill.amount / 100).toFixed(2)} is now overdue.`,
        type: "bill_due",
        read: false,
        relatedId: bill._id,
        createdAt: now,
      });
    }
  },
});

export const checkExpiringDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const allDocs = await ctx.db.query("documents").collect();

    for (const doc of allDocs) {
      if (!doc.expiryDate || doc.expiryDate <= now) continue;

      const timeUntilExpiry = doc.expiryDate - now;
      let shouldNotify = false;
      let message = "";

      if (timeUntilExpiry <= oneDay) {
        shouldNotify = true;
        message = `Your ${doc.title} expires tomorrow! Renew it as soon as possible.`;
      } else if (timeUntilExpiry <= sevenDays && timeUntilExpiry > oneDay) {
        shouldNotify = true;
        const days = Math.ceil(timeUntilExpiry / oneDay);
        message = `Your ${doc.title} expires in ${days} days. Consider renewing it soon.`;
      } else if (
        timeUntilExpiry <= thirtyDays &&
        timeUntilExpiry > sevenDays
      ) {
        shouldNotify = true;
        const days = Math.ceil(timeUntilExpiry / oneDay);
        message = `Your ${doc.title} will expire in ${days} days.`;
      }

      if (shouldNotify) {
        // Check if we already sent a notification recently for this document
        const recentNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", doc.userId))
          .order("desc")
          .take(100);

        const alreadyNotified = recentNotifications.some(
          (n) =>
            n.relatedId === doc._id &&
            n.type === "doc_expiry" &&
            now - n.createdAt < oneDay
        );

        if (!alreadyNotified) {
          await ctx.db.insert("notifications", {
            userId: doc.userId,
            title: "Document Expiring Soon",
            body: message,
            type: "doc_expiry",
            read: false,
            relatedId: doc._id,
            createdAt: now,
          });
        }
      }
    }
  },
});

export const sendBillReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const pendingBills = await ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const bill of pendingBills) {
      const timeUntilDue = bill.dueDate - now;

      if (timeUntilDue > 0 && timeUntilDue <= threeDays) {
        const days = Math.ceil(timeUntilDue / oneDay);

        // Check for existing recent reminder
        const recentNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", bill.userId))
          .order("desc")
          .take(50);

        const alreadyReminded = recentNotifications.some(
          (n) =>
            n.relatedId === bill._id &&
            n.type === "bill_due" &&
            now - n.createdAt < oneDay
        );

        if (!alreadyReminded) {
          await ctx.db.insert("notifications", {
            userId: bill.userId,
            title: "Bill Payment Reminder",
            body: `"${bill.title}" of $${(bill.amount / 100).toFixed(2)} is due in ${days} day${days === 1 ? "" : "s"}.`,
            type: "bill_due",
            read: false,
            relatedId: bill._id,
            createdAt: now,
          });
        }
      }
    }
  },
});
