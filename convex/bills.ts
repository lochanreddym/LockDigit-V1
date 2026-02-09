import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const listByStatus = query({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.billId);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    category: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bills", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    billId: v.id("bills"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    amount: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    recurring: v.optional(v.boolean()),
    recurrenceInterval: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { billId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(billId, filteredUpdates);
  },
});

export const markPaid = mutation({
  args: {
    billId: v.id("bills"),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.billId, {
      status: "paid",
      stripePaymentIntentId: args.stripePaymentIntentId,
      paidAt: Date.now(),
    });
  },
});

export const markOverdue = mutation({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.billId, { status: "overdue" });
  },
});

export const remove = mutation({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.billId);
  },
});

export const search = query({
  args: {
    userId: v.id("users"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", args.userId)
      )
      .take(20);
  },
});

export const getUpcomingBills = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() + args.daysAhead * 24 * 60 * 60 * 1000;
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    return bills.filter((bill) => bill.dueDate <= cutoff);
  },
});

export const getTotalDue = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const pendingBills = await ctx.db
      .query("bills")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    const overdueBills = await ctx.db
      .query("bills")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "overdue")
      )
      .collect();

    const allUnpaid = [...pendingBills, ...overdueBills];
    return allUnpaid.reduce((sum, bill) => sum + bill.amount, 0);
  },
});
