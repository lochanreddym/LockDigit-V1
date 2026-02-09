import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Resolve image URLs
    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        frontImageUrl: doc.frontImageId
          ? await ctx.storage.getUrl(doc.frontImageId)
          : null,
        backImageUrl: doc.backImageId
          ? await ctx.storage.getUrl(doc.backImageId)
          : null,
      }))
    );
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;

    return {
      ...doc,
      frontImageUrl: doc.frontImageId
        ? await ctx.storage.getUrl(doc.frontImageId)
        : null,
      backImageUrl: doc.backImageId
        ? await ctx.storage.getUrl(doc.backImageId)
        : null,
    };
  },
});

export const listByType = query({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type as any)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("drivers_license"),
      v.literal("passport"),
      v.literal("vaccination"),
      v.literal("national_id"),
      v.literal("insurance"),
      v.literal("other")
    ),
    title: v.string(),
    issuer: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    frontImageId: v.id("_storage"),
    backImageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      ...args,
      verified: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    issuer: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    metadata: v.optional(v.any()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { documentId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(documentId, filteredUpdates);
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    // Delete stored images
    if (doc.frontImageId) await ctx.storage.delete(doc.frontImageId);
    if (doc.backImageId) await ctx.storage.delete(doc.backImageId);

    await ctx.db.delete(args.documentId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const search = query({
  args: {
    userId: v.id("users"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", args.userId)
      )
      .take(20);
  },
});

export const getExpiringDocuments = query({
  args: {
    userId: v.id("users"),
    daysAhead: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() + args.daysAhead * 24 * 60 * 60 * 1000;
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return docs.filter(
      (doc) =>
        doc.expiryDate !== undefined &&
        doc.expiryDate <= cutoff &&
        doc.expiryDate > Date.now()
    );
  },
});
