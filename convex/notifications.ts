import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertResourceOwner, assertUserAccess, requireCurrentUser } from "./authHelpers";

async function countQueryResults(q: any): Promise<number> {
  const maybeCount = q?.count;
  if (typeof maybeCount === "function") {
    return await maybeCount.call(q);
  }
  const all = await q.collect();
  return all.length;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden notifications read");

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const getUnread = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const targetUserId = args.userId ?? user._id;
    assertUserAccess(args.userId, user._id, "Forbidden notifications read");

    return await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", targetUserId).eq("read", false)
      )
      .order("desc")
      .collect();
  },
});

export const getUnreadMine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .order("desc")
      .collect();
  },
});

export const getUnreadCount = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const targetUserId = args.userId ?? user._id;
    assertUserAccess(args.userId, user._id, "Forbidden notifications read");

    const unreadQuery = ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", targetUserId).eq("read", false)
      );

    return await countQueryResults(unreadQuery);
  },
});

export const getUnreadCountMine = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const unreadQuery = ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      );

    return await countQueryResults(unreadQuery);
  },
});

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("bill_due"),
      v.literal("doc_expiry"),
      v.literal("subsidy"),
      v.literal("payment_success"),
      v.literal("system")
    ),
    relatedId: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden notification create");

    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user_dedupe", (q) =>
          q.eq("userId", user._id).eq("dedupeKey", args.dedupeKey)
        )
        .first();
      if (existing) return existing._id;
    }

    return await ctx.db.insert("notifications", {
      ...args,
      userId: user._id,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return;

    assertResourceOwner(notification.userId, user._id, "Forbidden notification update");
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden notification update");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});

export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return;

    assertResourceOwner(notification.userId, user._id, "Forbidden notification delete");
    await ctx.db.delete(args.notificationId);
  },
});
