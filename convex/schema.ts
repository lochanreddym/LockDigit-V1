import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authSubject: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerified: v.optional(v.boolean()),
    pinHash: v.optional(v.string()),
    pinSalt: v.optional(v.string()),
    pinLength: v.optional(v.number()),
    pinFailedAttempts: v.optional(v.number()),
    pinLockedUntil: v.optional(v.number()),
    deviceId: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
    mainDocumentId: v.optional(v.id("documents")),
    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_device", ["deviceId"])
    .index("by_auth_subject", ["authSubject"]),

  documents: defineTable({
    userId: v.id("users"),
    type: v.string(),
    documentTypeId: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    jurisdictionCode: v.optional(v.string()),
    title: v.string(),
    issuer: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    frontImageId: v.id("_storage"),
    backImageId: v.optional(v.id("_storage")),
    frontMimeType: v.optional(v.string()),
    backMimeType: v.optional(v.string()),
    encryptionVersion: v.optional(v.number()),
    keyVersion: v.optional(v.number()),
    encrypted: v.optional(v.boolean()),
    contentHash: v.optional(v.string()),
    blockchainTxHash: v.optional(v.string()),
    blockchainChainId: v.optional(v.string()),
    blockchainAnchoredAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    verified: v.boolean(),
    verificationFingerprint: v.optional(v.string()),
    verificationExpiresAt: v.optional(v.number()),
    verificationLevel: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_document_type", ["userId", "documentTypeId"])
    .index("by_user_expiry_date", ["userId", "expiryDate"])
    .index("by_expiry_date", ["expiryDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  bankAccounts: defineTable({
    userId: v.id("users"),
    bankName: v.string(),
    accountLast4: v.string(),
    cardholderName: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    isDefault: v.boolean(),
    type: v.optional(v.union(v.literal("bank"), v.literal("card"))),
    expiryMonth: v.optional(v.string()),
    expiryYear: v.optional(v.string()),
    brand: v.optional(v.string()),
    paymentPinHash: v.optional(v.string()),
    paymentPinSalt: v.optional(v.string()),
    paymentPinKdf: v.optional(v.string()),
    paymentPinIterations: v.optional(v.number()),
    paymentPinFailedAttempts: v.optional(v.number()),
    paymentPinLockedUntil: v.optional(v.number()),
    isFrozen: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
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
      v.literal("bill_payment"),
      v.literal("transfer"),
      v.literal("wire_transfer")
    ),
    amount: v.number(),
    merchantName: v.optional(v.string()),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    paymentState: v.optional(
      v.union(
        v.literal("created"),
        v.literal("requires_action"),
        v.literal("processing"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    paymentToken: v.optional(v.string()),
    verificationToken: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    recipientPhone: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_payment_intent", ["stripePaymentIntentId"])
    .index("by_status_created_at", ["status", "createdAt"]),

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
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"])
    .index("by_user_dedupe", ["userId", "dedupeKey"]),

  savedRecipients: defineTable({
    userId: v.id("users"),
    recipientName: v.string(),
    accountLast4: v.string(),
    routingNumber: v.string(),
    bankName: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  internationalRecipients: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    nickname: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    country: v.string(),
    accountLast4: v.string(),
    swiftCode: v.string(),
    bankName: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

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

  ledgerAccounts: defineTable({
    userId: v.optional(v.id("users")),
    accountCode: v.string(),
    currency: v.string(),
    kind: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense")
    ),
    createdAt: v.number(),
  })
    .index("by_user_code", ["userId", "accountCode"])
    .index("by_code", ["accountCode"]),

  ledgerEntries: defineTable({
    postingId: v.string(),
    transactionId: v.optional(v.id("transactions")),
    userId: v.optional(v.id("users")),
    accountId: v.id("ledgerAccounts"),
    side: v.union(v.literal("debit"), v.literal("credit")),
    amount: v.number(),
    currency: v.string(),
    entryType: v.string(),
    createdAt: v.number(),
  })
    .index("by_posting", ["postingId"])
    .index("by_transaction", ["transactionId"])
    .index("by_user_created", ["userId", "createdAt"]),

  webhookEvents: defineTable({
    provider: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_provider_event", ["provider", "eventId"])
    .index("by_received_at", ["receivedAt"]),

  idempotencyKeys: defineTable({
    userId: v.id("users"),
    operation: v.string(),
    key: v.string(),
    requestHash: v.string(),
    response: v.any(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user_operation_key", ["userId", "operation", "key"])
    .index("by_expires_at", ["expiresAt"]),

  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    actorAuthSubject: v.optional(v.string()),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_action_created", ["action", "createdAt"]),

  anchorJobs: defineTable({
    documentId: v.id("documents"),
    contentHash: v.string(),
    dedupeKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    txHash: v.optional(v.string()),
    chainId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_next_attempt", ["status", "nextAttemptAt"])
    .index("by_document", ["documentId"])
    .index("by_dedupe", ["dedupeKey"]),
});
