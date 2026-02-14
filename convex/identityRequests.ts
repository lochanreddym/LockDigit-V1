import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("identityRequests")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone.trim()))
      .order("desc")
      .first();
  },
});

export const submitManualRequest = mutation({
  args: {
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    idNumber: v.string(),
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = args.phone.trim();

    // Optional: prevent duplicate pending requests for the same phone
    const existing = await ctx.db
      .query("identityRequests")
      .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
      .first();

    if (existing && existing.status === "pending") {
      throw new Error(
        "You already have a pending identity verification request for this phone number."
      );
    }

    const requestId = await ctx.db.insert("identityRequests", {
      fullName: args.fullName.trim(),
      email: args.email?.trim() || undefined,
      phone: normalizedPhone,
      idNumber: args.idNumber.trim(),
      countryCode: args.countryCode?.trim() || undefined,
      status: "pending",
      createdAt: Date.now(),
    });

    return requestId;
  },
});

