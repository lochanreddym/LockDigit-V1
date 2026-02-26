import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertResourceOwner, assertUserAccess, requireCurrentUser } from "./authHelpers";

const ALLOWED_DOCUMENT_TYPE_IDS = new Set<string>([
  "drivers_license",
  "passport",
  "vaccination",
  "national_id",
  "insurance",
  "other",
  "government_ids",
  "state_id",
  "enhanced_dl",
  "us_passport_book",
  "us_passport_card",
  "green_card",
  "ead",
  "i94",
  "trusted_traveler",
  "twic",
  "tribal_id",
  "military_id",
  "military_dependent_id",
  "concealed_carry",
  "industry_private",
  "employee_id",
  "contractor_badge",
  "building_access",
  "health_insurance_member",
  "dental_insurance",
  "vision_insurance",
  "life_insurance",
  "association_membership",
  "union_membership",
  "education",
  "student_id",
  "faculty_staff_id",
  "enrollment_letter",
  "transcript",
  "degree_diploma",
  "i20",
  "ds2019",
  "certification_id",
  "government_public",
  "medicare",
  "medicaid",
  "snap_ebt",
  "wic",
  "va_health_id",
  "ss_benefit_letter",
  "public_housing_id",
  "state_benefit_card",
  "voter_registration",
  "banking_financial",
  "ssn",
  "itin",
  "ein",
  "bank_proof_letter",
  "credit_report",
  "loan_account",
  "mortgage_doc",
  "investment_statement",
  "skill_vocational",
  "medical_license",
  "nursing_license",
  "pharmacy_license",
  "engineering_license",
  "teaching_license",
  "bar_license",
  "cpa_license",
  "cosmetology_license",
  "real_estate_license",
  "real_estate_appraiser",
  "insurance_agent_license",
  "notary_public",
  "private_investigator",
  "electrician_license",
  "plumber_license",
  "hvac_license",
  "contractor_license",
  "security_guard_license",
  "osha_cert",
  "food_handler",
  "alcohol_service",
  "ministry_defence",
  "mod_military_id",
  "veteran_id",
  "dd214",
  "dependent_military_id",
  "base_access_pass",
  "transport_infrastructure",
  "transport_dl",
  "learner_permit",
  "cdl",
  "vehicle_registration",
  "vehicle_title",
  "auto_insurance",
  "passport_travel",
  "trusted_traveler_travel",
  "health_wellness",
  "health_insurance",
  "dental_insurance_hw",
  "vision_insurance_hw",
  "vaccination_record",
  "blood_group_card",
  "organ_donor_card",
  "hospital_patient_id",
  "identity_docs",
  "birth_certificate",
  "marriage_certificate",
  "divorce_decree",
  "name_change_order",
  "death_certificate",
  "naturalization_cert",
  "sports_culture",
  "sports_club",
  "gym_membership",
  "stadium_pass",
  "museum_membership",
  "cultural_assoc_id",
  "hunting_license",
  "fishing_license",
  "boating_license",
  "national_service",
  "volunteer_id",
  "community_service_cert",
  "americorps_id",
  "service_participation_cert",
]);

function resolveDocumentTypeId(type?: string, documentTypeId?: string) {
  const candidate = (documentTypeId ?? type ?? "other").trim().toLowerCase();
  if (!candidate) return "other";
  if (!ALLOWED_DOCUMENT_TYPE_IDS.has(candidate)) {
    throw new Error(`Unsupported document type: ${candidate}`);
  }
  return candidate;
}

export const listMine = query({
  args: { _refreshHint: v.optional(v.number()) },
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

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

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden document list access");

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

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

export const getByIdInternal = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;

    assertResourceOwner(doc.userId, user._id, "Forbidden document read");

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

export const listVerifiedByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden document list access");

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const verified = docs.filter((doc) => doc.verified);

    return await Promise.all(
      verified.map(async (doc) => ({
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

export const listVerifiedMine = query({
  args: { _refreshHint: v.optional(v.number()) },
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const verified = docs.filter((doc) => doc.verified);

    return await Promise.all(
      verified.map(async (doc) => ({
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

export const listByType = query({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden document list access");

    const normalizedType = resolveDocumentTypeId(args.type);
    return await ctx.db
      .query("documents")
      .withIndex("by_document_type", (q) =>
        q.eq("userId", args.userId).eq("documentTypeId", normalizedType)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    type: v.optional(v.string()),
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
    encrypted: v.optional(v.boolean()),
    encryptionVersion: v.optional(v.number()),
    keyVersion: v.optional(v.number()),
    contentHash: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    assertUserAccess(args.userId, user._id, "Forbidden document creation");

    const normalizedType = resolveDocumentTypeId(args.type, args.documentTypeId);

    return await ctx.db.insert("documents", {
      ...args,
      userId: user._id,
      type: normalizedType,
      documentTypeId: normalizedType,
      encrypted: args.encrypted ?? false,
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
    type: v.optional(v.string()),
    documentTypeId: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    jurisdictionCode: v.optional(v.string()),
    metadata: v.optional(v.any()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    assertResourceOwner(doc.userId, user._id, "Forbidden document update");

    const { documentId, type, documentTypeId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;

    if (type !== undefined || documentTypeId !== undefined) {
      const normalizedType = resolveDocumentTypeId(type, documentTypeId);
      filteredUpdates.type = normalizedType;
      filteredUpdates.documentTypeId = normalizedType;
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(documentId, filteredUpdates);
    }
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    assertResourceOwner(doc.userId, user._id, "Forbidden document removal");

    if (doc.frontImageId) await ctx.storage.delete(doc.frontImageId);
    if (doc.backImageId) await ctx.storage.delete(doc.backImageId);

    await ctx.db.delete(args.documentId);
  },
});

export const setVerification = mutation({
  args: {
    documentId: v.id("documents"),
    fingerprint: v.string(),
    verificationExpiresAt: v.number(),
    verificationLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    assertResourceOwner(doc.userId, user._id, "Forbidden verification update");

    await ctx.db.patch(args.documentId, {
      verified: true,
      verificationFingerprint: args.fingerprint,
      verificationExpiresAt: args.verificationExpiresAt,
      verificationLevel: args.verificationLevel,
      verifiedAt: Date.now(),
    });
  },
});

export const revokeVerification = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    assertResourceOwner(doc.userId, user._id, "Forbidden verification revoke");

    await ctx.db.patch(args.documentId, {
      verified: false,
      verificationFingerprint: undefined,
      verificationExpiresAt: undefined,
      verificationLevel: undefined,
      verifiedAt: undefined,
    });
  },
});

export const setBlockchainAnchor = internalMutation({
  args: {
    documentId: v.id("documents"),
    blockchainTxHash: v.string(),
    blockchainChainId: v.string(),
    blockchainAnchoredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    await ctx.db.patch(args.documentId, {
      blockchainTxHash: args.blockchainTxHash,
      blockchainChainId: args.blockchainChainId,
      blockchainAnchoredAt: args.blockchainAnchoredAt,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const search = query({
  args: {
    userId: v.optional(v.id("users")),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const targetUserId = args.userId ?? user._id;
    assertUserAccess(args.userId, user._id, "Forbidden document search");

    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", targetUserId)
      )
      .take(20);
  },
});

export const searchMine = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", user._id)
      )
      .take(20);
  },
});

export const getExpiringDocuments = query({
  args: {
    userId: v.optional(v.id("users")),
    daysAhead: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const targetUserId = args.userId ?? user._id;
    assertUserAccess(args.userId, user._id, "Forbidden expiring documents read");

    const now = Date.now();
    const cutoff = now + args.daysAhead * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("documents")
      .withIndex("by_user_expiry_date", (q) =>
        q.eq("userId", targetUserId).gte("expiryDate", now).lte("expiryDate", cutoff)
      )
      .collect();
  },
});

export const getExpiringMine = query({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);

    const now = Date.now();
    const cutoff = now + args.daysAhead * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("documents")
      .withIndex("by_user_expiry_date", (q) =>
        q.eq("userId", user._id).gte("expiryDate", now).lte("expiryDate", cutoff)
      )
      .collect();
  },
});

export const listAllowedDocumentTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return Array.from(ALLOWED_DOCUMENT_TYPE_IDS);
  },
});
