import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getActiveByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return subs.filter((s) => s.status === "active");
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    serviceName: v.string(),
    amount: v.number(),
    billingCycle: v.string(),
    nextBillingDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subscriptions", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    serviceName: v.optional(v.string()),
    amount: v.optional(v.number()),
    billingCycle: v.optional(v.string()),
    nextBillingDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { subscriptionId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(subscriptionId, filteredUpdates);
  },
});

export const cancel = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, { status: "cancelled" });
  },
});

export const remove = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});

export const getMonthlyTotal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeSubs = subs.filter((s) => s.status === "active");

    return activeSubs.reduce((total, sub) => {
      // Normalize to monthly amount
      switch (sub.billingCycle) {
        case "weekly":
          return total + sub.amount * 4;
        case "monthly":
          return total + sub.amount;
        case "quarterly":
          return total + sub.amount / 3;
        case "yearly":
          return total + sub.amount / 12;
        default:
          return total + sub.amount;
      }
    }, 0);
  },
});
