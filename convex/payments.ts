import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPaymentPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

function generatePaymentToken(): string {
  const ts = Date.now().toString();
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const rand = toHex(bytes.buffer).toUpperCase();
  return `T${ts}${rand}`;
}

function generateVerificationToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `V${toHex(bytes.buffer).toUpperCase()}`;
}

export const createTransaction = mutation({
  args: {
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

export const getRecentTransferContacts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    const seen = new Set<string>();
    const contacts: {
      phone: string;
      name: string;
      lastTransferAt: number;
    }[] = [];

    for (const tx of transactions) {
      if (tx.recipientPhone && !seen.has(tx.recipientPhone)) {
        seen.add(tx.recipientPhone);
        contacts.push({
          phone: tx.recipientPhone,
          name: tx.merchantName || tx.recipientPhone,
          lastTransferAt: tx.completedAt || tx.createdAt,
        });
      }
    }

    return contacts;
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
    const hash = await hashPaymentPin(args.pin, account.paymentPinSalt);
    return hash === account.paymentPinHash;
  },
});

export const removeBankAccount = mutation({
  args: { accountId: v.id("bankAccounts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
  },
});

// Saved recipients (domestic)
export const listSavedRecipients = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("savedRecipients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const addSavedRecipient = mutation({
  args: {
    userId: v.id("users"),
    recipientName: v.string(),
    accountLast4: v.string(),
    routingNumber: v.string(),
    bankName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("savedRecipients", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// International recipients
export const listInternationalRecipients = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("internationalRecipients")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const addInternationalRecipient = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("internationalRecipients", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Local transfer (between accounts, no Stripe needed)
export const createLocalTransfer = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    type: v.union(v.literal("transfer"), v.literal("wire_transfer")),
    merchantName: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentToken = generatePaymentToken();
    const verificationToken = generateVerificationToken();

    const txId = await ctx.db.insert("transactions", {
      userId: args.userId,
      type: args.type,
      amount: args.amount,
      description: args.description,
      merchantName: args.merchantName,
      paymentMethod: args.paymentMethod,
      paymentToken,
      verificationToken,
      status: "completed",
      completedAt: Date.now(),
      createdAt: Date.now(),
    });

    return { transactionId: txId, verified: true };
  },
});
