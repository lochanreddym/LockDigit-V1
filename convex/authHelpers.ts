import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;
type DbCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return identity;
}

export async function requireCurrentUser(ctx: DbCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_auth_subject", (q) => q.eq("authSubject", identity.tokenIdentifier))
    .first();

  if (!user) {
    throw new Error("No user linked to authenticated session");
  }

  return { identity, user };
}

export async function requireCurrentUserFromAction(
  ctx: ActionCtx
): Promise<{ identity: Awaited<ReturnType<typeof requireIdentity>>; user: Doc<"users"> }> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.runQuery(internal.users.getByAuthSubjectInternal, {
    authSubject: identity.tokenIdentifier,
  });

  if (!user) {
    throw new Error("No user linked to authenticated session");
  }

  return { identity, user };
}

export function assertUserAccess(
  requestedUserId: Id<"users"> | undefined,
  currentUserId: Id<"users">,
  message = "Forbidden"
) {
  if (requestedUserId && requestedUserId !== currentUserId) {
    throw new Error(message);
  }
}

export function assertResourceOwner(
  resourceUserId: Id<"users">,
  currentUserId: Id<"users">,
  message = "Forbidden"
) {
  if (resourceUserId !== currentUserId) {
    throw new Error(message);
  }
}

const SENSITIVE_KEYS = new Set([
  "email",
  "ip",
  "ssn",
  "userId",
  "user_id",
  "phone",
  "token",
]);

function sanitizeDetails(details: unknown): Record<string, unknown> {
  if (details == null || typeof details !== "object") return {};
  const obj = details as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key]) => !SENSITIVE_KEYS.has(key.toLowerCase())
    )
  );
}

export async function writeAuditLog(
  ctx: MutationCtx,
  args: {
    userId?: Id<"users">;
    actorAuthSubject?: string;
    action: string;
    targetType: string;
    targetId?: string;
    details?: unknown;
  }
) {
  const sanitized = sanitizeDetails(args.details);
  await ctx.db.insert("auditLogs", {
    userId: args.userId,
    actorAuthSubject: args.actorAuthSubject,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    details: sanitized,
    createdAt: Date.now(),
  });
}

export function nowDayUtcRange(ts = Date.now()) {
  const d = new Date(ts);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

export function jsonLog(event: string, data: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      ...data,
      ts: new Date().toISOString(),
      event,
    })
  );
}
