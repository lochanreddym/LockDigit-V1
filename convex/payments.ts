import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

function hashPaymentPin(pin: string, salt: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function generatePaymentToken(): string {
  const crypto = require("crypto");
  const ts = Date.now().toString();
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `T${ts}${rand}`;
}

function generateVerificationToken(): string {
  const crypto = require("crypto");
  return `V${crypto.randomBytes(16).toString("hex").toUpperCase()}`;
}

export const createTransaction = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("payment"),
      v.literal("scan_to_pay"),
      v.literal("bill_payment")
    ),
    amount: v.number(),
    merchantName: v.optional(v.string()),
    description: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    paymentToken: v.string(),
    recipientPhone: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { transactionId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(transactionId, filteredUpdates);
  },
});

export const getTransactionsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const getRecentTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

// Stripe Payment Intent creation via server action
export const createPaymentIntent = action({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
    userId: v.id("users"),
    description: v.string(),
    merchantName: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const paymentToken = generatePaymentToken();

    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: args.amount.toString(),
        currency: args.currency || "usd",
        "automatic_payment_methods[enabled]": "true",
        description: args.description,
        "metadata[userId]": args.userId,
        "metadata[paymentToken]": paymentToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe error: ${error}`);
    }

    const paymentIntent = await response.json();

    await ctx.runMutation(api.payments.createTransaction, {
      userId: args.userId,
      type: "payment",
      amount: args.amount,
      description: args.description,
      merchantName: args.merchantName,
      stripePaymentIntentId: paymentIntent.id,
      paymentToken,
      recipientPhone: args.recipientPhone,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentToken,
    };
  },
});

export const verifyAndCompletePayment = mutation({
  args: {
    stripePaymentIntentId: v.string(),
    paymentToken: v.string(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .collect();

    const transaction = transactions[0];
    if (!transaction) {
      return { verified: false, error: "Transaction not found" };
    }

    if (transaction.paymentToken !== args.paymentToken) {
      return { verified: false, error: "Token mismatch" };
    }

    const verificationToken = generateVerificationToken();
    const completedAt = Date.now();

    await ctx.db.patch(transaction._id, {
      status: "completed",
      verificationToken,
      completedAt,
      paymentMethod: args.paymentMethod,
    });

    return {
      verified: true,
      transactionId: transaction._id,
      paymentToken: transaction.paymentToken,
      verificationToken,
      completedAt,
      amount: transaction.amount,
      merchantName: transaction.merchantName,
      description: transaction.description,
    };
  },
});

export const getTransactionById = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

// Bank accounts
export const listBankAccounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bankAccounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addBankAccount = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    if (args.isDefault) {
      const existing = await ctx.db
        .query("bankAccounts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      for (const account of existing) {
        if (account.isDefault) {
          await ctx.db.patch(account._id, { isDefault: false });
        }
      }
    }
    return await ctx.db.insert("bankAccounts", args);
  },
});

export const verifyPaymentPin = mutation({
  args: {
    accountId: v.id("bankAccounts"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account?.paymentPinHash || !account?.paymentPinSalt) return false;
    const hash = hashPaymentPin(args.pin, account.paymentPinSalt);
    return hash === account.paymentPinHash;
  },
});

export const removeBankAccount = mutation({
  args: { accountId: v.id("bankAccounts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
  },
});
