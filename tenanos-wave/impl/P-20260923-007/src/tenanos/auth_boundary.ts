/**
 * auth_boundary.ts — tool execution auth boundary (P-20260923-007).
 *
 * FastMCP AuthMiddleware pattern:
 *   1. list-filter: filter tools at discovery so tools the caller is not
 *      granted are invisible at catalog time;
 *   2. call-recheck: re-resolve + re-check the capability grant at call time
 *      (TOCTOU: a grant revoked after discovery must not execute);
 *   3. fail closed on missing/ambiguous auth context;
 *   4. ambiguous denials: not-found and not-authorized produce the IDENTICAL
 *      exterior denial string (no existence leakage).
 *
 * Policy delegates to the PING capability authority via the injected
 * GrantResolver. This module never grants anything itself and creates no
 * second authority. It is the AUTH boundary (who may see/call); the
 * tool-safety guard (P-20260923-093) is the SAFETY boundary (effect classes,
 * confirmation, idempotency, retry). The call-recheck here is the
 * grant-backed resolver that feeds the guard's per-dispatch gate, so both
 * layers resolve against the same grant source and can never diverge.
 *
 * Pure and deterministic apart from the injected resolver (which performs
 * the live authority lookup). No I/O, no imports.
 */

/** The single opaque denial. Byte-identical for unknown tool, revoked grant,
 *  and missing context: the exterior surface leaks nothing. */
export const DENIED_REASON = 'tool call denied' as const;

export interface AuthContext {
  /** Agent identity the grant is resolved for. Empty = unusable. */
  agentId: string;
  /** Roles/scopes asserted with the call. */
  roles: readonly string[];
  /** Opaque credential handle. Presence is required; content is never
   *  inspected here (the authority owns credential semantics). */
  credentialPresent: boolean;
}

export interface ToolDescriptor {
  id: string;
  description?: string;
}

export type Grant = { granted: true } | { granted: false };

/**
 * Live grant resolution against the PING capability authority.
 * Called at discovery AND at every call (no caching inside this module:
 * caching a grant is exactly the TOCTOU this boundary exists to close).
 * A throwing resolver fails closed; the throw never propagates.
 */
export type GrantResolver = (
  toolId: string,
  ctx: AuthContext,
) => Grant | Promise<Grant>;

export type AuthzDecision =
  | { allowed: true; toolId: string }
  | { allowed: false; toolId: string; reason: typeof DENIED_REASON };

/** A context is usable only when it names an agent and carries a credential. */
export function isContextUsable(ctx: AuthContext): boolean {
  return ctx.credentialPresent && ctx.agentId.length > 0;
}

async function resolveGrant(
  toolId: string,
  ctx: AuthContext,
  resolve: GrantResolver,
): Promise<Grant> {
  try {
    return await resolve(toolId, ctx);
  } catch {
    // A failing grant lookup is indistinguishable from "no grant":
    // fail closed, leak nothing.
    return { granted: false };
  }
}

function deny(toolId: string): AuthzDecision {
  return { allowed: false, toolId, reason: DENIED_REASON };
}

/**
 * Discovery-time list filter (FastMCP AuthMiddleware list-filter).
 * Tools without a live grant are removed from the catalog the agent sees.
 * Missing/unusable context -> empty catalog (fail closed).
 */
export async function filterAtDiscovery(
  tools: readonly ToolDescriptor[],
  ctx: AuthContext,
  resolve: GrantResolver,
): Promise<readonly ToolDescriptor[]> {
  if (!isContextUsable(ctx)) {
    return [];
  }
  const visible: ToolDescriptor[] = [];
  for (const tool of tools) {
    const grant = await resolveGrant(tool.id, ctx, resolve);
    if (grant.granted) {
      visible.push(tool);
    }
  }
  return visible;
}

/**
 * Call-time authorization (FastMCP AuthMiddleware call-recheck).
 * Re-resolves the grant on EVERY call: a grant revoked after discovery
 * denies here. Denial reason is always the opaque constant, whether the
 * tool is unknown, the grant was revoked, the context is missing, or the
 * resolver threw.
 */
export async function authorizeAtCall(
  toolId: string,
  ctx: AuthContext,
  resolve: GrantResolver,
): Promise<AuthzDecision> {
  if (!isContextUsable(ctx)) {
    return deny(toolId);
  }
  const grant = await resolveGrant(toolId, ctx, resolve);
  return grant.granted ? { allowed: true, toolId } : deny(toolId);
}
