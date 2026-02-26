import { sha256 } from "@noble/hashes/sha2.js";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertUserAccess,
  requireCurrentUser,
  requireIdentity,
  writeAuditLog,
} from "./authHelpers";

const MAX_PIN_ATTEMPTS = 5;

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const hash = sha256(bytes);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const PIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function toPublicUser(user: Doc<"users">) {
  const {
    pinHash,
    pinSalt,
    pinFailedAttempts,
    pinLockedUntil,
    ...safe
  } = user;
  return safe;
}

function isPinConfigured(user: Doc<"users">) {
  return Boolean(user.pinHash && user.pinSalt);
}

export const getByAuthSubjectInternal = internalQuery({
  args: { authSubject: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) => q.eq("authSubject", args.authSubject))
      .first();
  },
});

/**
 * Deprecated and gated to reduce account enumeration risk.
 */
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const allowLegacyLookup = process.env.ALLOW_LEGACY_PHONE_LOOKUP === "true";
    if (!allowLegacyLookup) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return toPublicUser(user);
  },
});

export const getMeForPin = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    return {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      hasPin: isPinConfigured(user),
      pinLength: user.pinLength ?? 4,
      pinFailedAttempts: user.pinFailedAttempts ?? 0,
      pinLockedUntil: user.pinLockedUntil,
      deviceId: user.deviceId,
    };
  },
});

export const verifyPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user.pinHash || !user.pinSalt) {
      return {
        success: false,
        locked: false,
        remainingAttempts: MAX_PIN_ATTEMPTS,
        attemptsMade: 0,
        maxAttempts: MAX_PIN_ATTEMPTS,
      };
    }

    const now = Date.now();
    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      return {
        success: false,
        locked: true,
        remainingAttempts: 0,
        attemptsMade: user.pinFailedAttempts ?? MAX_PIN_ATTEMPTS,
        maxAttempts: MAX_PIN_ATTEMPTS,
        lockedUntil: user.pinLockedUntil,
      };
    }

    const computedHash = sha256Hex(`${user.pinSalt}:${args.pin}`);
    if (computedHash === user.pinHash) {
      await ctx.db.patch(user._id, {
        pinFailedAttempts: 0,
        pinLockedUntil: undefined,
      });
      return {
        success: true,
        locked: false,
        remainingAttempts: MAX_PIN_ATTEMPTS,
        attemptsMade: 0,
        maxAttempts: MAX_PIN_ATTEMPTS,
      };
    }

    const attempts = (user.pinFailedAttempts ?? 0) + 1;
    const locked = attempts >= MAX_PIN_ATTEMPTS;
    const lockedUntil = locked ? now + PIN_LOCK_WINDOW_MS : undefined;

    await ctx.db.patch(user._id, {
      pinFailedAttempts: attempts,
      pinLockedUntil: lockedUntil,
    });

    return {
      success: false,
      locked,
      attemptsMade: attempts,
      maxAttempts: MAX_PIN_ATTEMPTS,
      remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - attempts),
      lockedUntil,
    };
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden user profile read");
    return toPublicUser(user);
  },
});

export const getByIdWithProfileUrl = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden user profile read");

    const profileImageUrl = user.profileImageId
      ? await ctx.storage.getUrl(user.profileImageId)
      : null;
    return { ...toPublicUser(user), profileImageUrl };
  },
});

export const getMeWithProfileUrl = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const profileImageUrl = user.profileImageId
      ? await ctx.storage.getUrl(user.profileImageId)
      : null;
    return { ...toPublicUser(user), profileImageUrl };
  },
});

export const getByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user.deviceId || user.deviceId !== args.deviceId) {
      return null;
    }
    return toPublicUser(user);
  },
});

export const bootstrapSession = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const authSubject = identity.tokenIdentifier;

    const existingBySubject = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) => q.eq("authSubject", authSubject))
      .first();

    if (existingBySubject) {
      const patch: Partial<Doc<"users">> = {};
      if (!existingBySubject.phone && args.phone) patch.phone = args.phone;
      if (!existingBySubject.email && args.email) patch.email = args.email;
      if ((!existingBySubject.name || existingBySubject.name === "User") && args.name) {
        patch.name = args.name;
      }
      if (!existingBySubject.deviceId && args.deviceId) patch.deviceId = args.deviceId;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existingBySubject._id, patch);
      }

      return {
        userId: existingBySubject._id,
        isNewUser: false,
        hasPin: isPinConfigured(existingBySubject),
        pinLength: existingBySubject.pinLength ?? 6,
      };
    }

    if (args.phone) {
      const existingByPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone!))
        .first();

      if (existingByPhone) {
        if (
          existingByPhone.authSubject &&
          existingByPhone.authSubject !== authSubject
        ) {
          throw new Error("Phone number is already linked to another account");
        }

        await ctx.db.patch(existingByPhone._id, {
          authSubject,
          email: existingByPhone.email ?? args.email,
          deviceId: existingByPhone.deviceId ?? args.deviceId,
          name:
            existingByPhone.name && existingByPhone.name !== "User"
              ? existingByPhone.name
              : args.name ?? existingByPhone.name,
          phoneVerified: true,
        });

        return {
          userId: existingByPhone._id,
          isNewUser: false,
          hasPin: isPinConfigured(existingByPhone),
          pinLength: existingByPhone.pinLength ?? 6,
        };
      }
    }

    const userId = await ctx.db.insert("users", {
      authSubject,
      name: args.name?.trim() || identity.name || "User",
      email: args.email,
      phone: args.phone,
      phoneVerified: Boolean(args.phone),
      deviceId: args.deviceId,
      createdAt: Date.now(),
      pinFailedAttempts: 0,
    });

    await writeAuditLog(ctx, {
      userId,
      actorAuthSubject: authSubject,
      action: "user.bootstrap.created",
      targetType: "user",
      targetId: userId,
      details: { hasPhone: Boolean(args.phone) },
    });

    return { userId, isNewUser: true, hasPin: false, pinLength: 6 };
  },
});

/**
 * Legacy entrypoint kept for compatibility. New flows should use bootstrapSession + updatePin.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    pinHash: v.string(),
    pinSalt: v.string(),
    pinLength: v.optional(v.number()),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth_subject", (q) => q.eq("authSubject", identity.tokenIdentifier))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        phone: args.phone ?? existing.phone,
        phoneVerified: Boolean(args.phone ?? existing.phone),
        pinHash: args.pinHash,
        pinSalt: args.pinSalt,
        pinLength: args.pinLength,
        deviceId: args.deviceId ?? existing.deviceId,
        pinFailedAttempts: 0,
        pinLockedUntil: undefined,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      authSubject: identity.tokenIdentifier,
      name: args.name,
      email: args.email,
      phone: args.phone,
      phoneVerified: Boolean(args.phone),
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      pinLength: args.pinLength,
      deviceId: args.deviceId,
      createdAt: Date.now(),
      pinFailedAttempts: 0,
    });

    return userId;
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.optional(v.id("users")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden profile update");

    const { userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(user._id, filteredUpdates);
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.profile.updated",
      targetType: "user",
      targetId: user._id,
      details: Object.keys(filteredUpdates),
    });
  },
});

export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    profileImageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    const filteredUpdates = Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(user._id, filteredUpdates);
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.profile.updated",
      targetType: "user",
      targetId: user._id,
      details: Object.keys(filteredUpdates),
    });
  },
});

export const updateDeviceBinding = mutation({
  args: {
    userId: v.optional(v.id("users")),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden device update");

    await ctx.db.patch(user._id, { deviceId: args.deviceId });

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.device.updated",
      targetType: "user",
      targetId: user._id,
      details: { deviceIdUpdated: true },
    });
  },
});

export const rollbackBootstrapUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    if (user._id !== args.userId) {
      throw new Error("Forbidden rollback");
    }
    if (isPinConfigured(user)) {
      throw new Error("Cannot rollback user with PIN");
    }
    await ctx.db.delete(args.userId);
  },
});

export const updatePin = mutation({
  args: {
    userId: v.optional(v.id("users")),
    pinHash: v.string(),
    pinSalt: v.string(),
    pinLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden PIN update");

    await ctx.db.patch(user._id, {
      pinHash: args.pinHash,
      pinSalt: args.pinSalt,
      pinLength: args.pinLength,
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
    });

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.pin.updated",
      targetType: "user",
      targetId: user._id,
    });
  },
});

export const recordFailedPinAttempt = mutation({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden PIN attempt mutation");

    const now = Date.now();
    const currentlyLocked = Boolean(user.pinLockedUntil && user.pinLockedUntil > now);

    if (currentlyLocked) {
      return {
        locked: true,
        lockedUntil: user.pinLockedUntil,
        remainingAttempts: 0,
      };
    }

    const attempts = (user.pinFailedAttempts ?? 0) + 1;
    const locked = attempts >= MAX_PIN_ATTEMPTS;
    const lockedUntil = locked ? now + PIN_LOCK_WINDOW_MS : undefined;

    await ctx.db.patch(user._id, {
      pinFailedAttempts: attempts,
      pinLockedUntil: lockedUntil,
    });

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.pin.failed_attempt",
      targetType: "user",
      targetId: user._id,
      details: { attempts, locked },
    });

    return {
      locked,
      lockedUntil,
      remainingAttempts: Math.max(0, MAX_PIN_ATTEMPTS - attempts),
    };
  },
});

export const clearPinAttemptsInternal = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
    });
  },
});

export const setMainDocument = mutation({
  args: {
    userId: v.optional(v.id("users")),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden main document update");

    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      if (!doc || !doc.verified) {
        throw new Error("Only verified documents can be set as main ID");
      }
      if (doc.userId !== user._id) {
        throw new Error("Document does not belong to this user");
      }
    }

    await ctx.db.patch(user._id, { mainDocumentId: args.documentId });

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.main_document.updated",
      targetType: "document",
      targetId: args.documentId,
    });
  },
});

export const setMainDocumentMe = mutation({
  args: {
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const { user, identity } = await requireCurrentUser(ctx);

    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      if (!doc || !doc.verified) {
        throw new Error("Only verified documents can be set as main ID");
      }
      if (doc.userId !== user._id) {
        throw new Error("Document does not belong to this user");
      }
    }

    await ctx.db.patch(user._id, { mainDocumentId: args.documentId });

    await writeAuditLog(ctx, {
      userId: user._id,
      actorAuthSubject: identity.tokenIdentifier,
      action: "user.main_document.updated",
      targetType: "document",
      targetId: args.documentId,
    });
  },
});

export const verifyDeviceBinding = query({
  args: {
    userId: v.optional(v.id("users")),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden device binding check");

    if (!user.deviceId) return false;
    return user.deviceId === args.deviceId;
  },
});
