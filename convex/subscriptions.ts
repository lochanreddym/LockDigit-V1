import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertResourceOwner, assertUserAccess, requireCurrentUser } from "./authHelpers";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden subscription read");

    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getActiveByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden subscription read");

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return subs.filter((s) => s.status === "active");
  },
});

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    serviceName: v.string(),
    amount: v.number(),
    billingCycle: v.string(),
    nextBillingDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (args.userId !== undefined) {
      assertUserAccess(args.userId, user._id, "Forbidden subscription create");
    }

    return await ctx.db.insert("subscriptions", {
      ...args,
      userId: user._id,
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
    const { user } = await requireCurrentUser(ctx);
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    assertResourceOwner(
      subscription.userId,
      user._id,
      "Forbidden subscription update"
    );

    const { subscriptionId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    await ctx.db.patch(subscriptionId, filteredUpdates);
  },
});

export const cancel = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    assertResourceOwner(
      subscription.userId,
      user._id,
      "Forbidden subscription update"
    );
    await ctx.db.patch(args.subscriptionId, { status: "cancelled" });
  },
});

export const remove = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    assertResourceOwner(
      subscription.userId,
      user._id,
      "Forbidden subscription delete"
    );
    await ctx.db.delete(args.subscriptionId);
  },
});

export const getMonthlyTotal = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden subscription read");

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeSubs = subs.filter((s) => s.status === "active");

    return activeSubs.reduce((total, sub) => {
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
