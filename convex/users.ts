import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    pinHash: v.string(),
    pinSalt: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if phone already registered
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) {
      throw new Error("Phone number already registered");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      phoneVerified: true,
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      deviceId: args.deviceId,
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(userId, filteredUpdates);
  },
});

export const updateDeviceBinding = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { deviceId: args.deviceId });
  },
});

export const updatePin = mutation({
  args: {
    userId: v.id("users"),
    pinHash: v.string(),
    pinSalt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
    });
  },
});

export const verifyDeviceBinding = query({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;
    return user.deviceId === args.deviceId;
  },
});
