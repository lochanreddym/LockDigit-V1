import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for overdue bills every hour
crons.interval(
  "check overdue bills",
  { hours: 1 },
  internal.cronHelpers.checkOverdueBills
);

// Check for expiring documents daily at 9 AM UTC
crons.daily(
  "check expiring documents",
  { hourUTC: 9, minuteUTC: 0 },
  internal.cronHelpers.checkExpiringDocuments
);

// Check for upcoming bill reminders daily at 8 AM UTC
crons.daily(
  "bill payment reminders",
  { hourUTC: 8, minuteUTC: 0 },
  internal.cronHelpers.sendBillReminders
);

// Reconcile pending Stripe transactions against processor state.
crons.interval(
  "reconcile stripe transactions",
  { minutes: 60 },
  internal.payments.reconcileStripeTransactionsInternal
);

// Drain blockchain anchor queue in small regular batches.
crons.interval(
  "process blockchain anchor queue",
  { minutes: 5 },
  internal.blockchain.processPendingAnchorJobs
);

// Evaluate operational health thresholds and emit immutable ops alerts.
crons.interval(
  "evaluate operational alerts",
  { minutes: 5 },
  internal.ops.evaluateAlertsInternal
);

export default crons;
