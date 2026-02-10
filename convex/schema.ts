import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    phoneVerified: v.boolean(),
    pinHash: v.string(),
    pinSalt: v.string(),
    deviceId: v.string(),
    profileImageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_device", ["deviceId"]),

  documents: defineTable({
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
    verified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  bankAccounts: defineTable({
    userId: v.id("users"),
    bankName: v.string(),
    accountLast4: v.string(),
    stripePaymentMethodId: v.optional(v.string()),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  bills: defineTable({
    userId: v.id("users"),
    title: v.string(),
    category: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    recurring: v.boolean(),
    recurrenceInterval: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_due_date", ["dueDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  subscriptions: defineTable({
    userId: v.id("users"),
    serviceName: v.string(),
    amount: v.number(),
    billingCycle: v.string(),
    nextBillingDate: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("payment"),
      v.literal("scan_to_pay"),
      v.literal("bill_payment")
    ),
    amount: v.number(),
    merchantName: v.optional(v.string()),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("bill_due"),
      v.literal("doc_expiry"),
      v.literal("subsidy"),
      v.literal("payment_success"),
      v.literal("system")
    ),
    read: v.boolean(),
    relatedId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  identityRequests: defineTable({
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    idNumber: v.string(),
    countryCode: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
  }).index("by_phone", ["phone"]),
});
