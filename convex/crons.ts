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

export default crons;
