p = "src/app/api/fyd/objects/[objectId]/overrides/patch-loop.ts"
s = open(p).read()

old = """/**
 * The acting owner identity on this route. DEMO SCAFFOLDING: always the
 * seeded demo actor, never a verified owner. Authentication alone never
 * grants mutation; the capability verdict (resolved separately by the
 * demo chain) is the only gate to the apply step.
 */
export interface OwnerActorContext {
  actorId: string;
  label: string;
  /** Always true on this route. Rendered on every demo-owner affordance. */
  demoOwnerContext: true;
  /** Human-readable statement of what this context is and is not. */
  disclosure: string;
}"""
new = """/**
 * The acting owner identity, future-neutral. The demo implementation
 * (OwnerActorContext, below) pins demoOwnerContext: true; a future
 * PING-backed implementation satisfies this base with a verified owner
 * identity and no demo marker. Demo honesty is preserved structurally:
 * every DEMO response and approval still carries the literal
 * demoOwnerContext: true stamp, so demo authorization can never be
 * mistaken for production authorization.
 */
export interface OwnerActor {
  actorId: string;
  label: string;
  /** Human-readable statement of what this context is and is not. */
  disclosure: string;
}

/**
 * The acting owner identity on this route. DEMO SCAFFOLDING: always the
 * seeded demo actor, never a verified owner. Authentication alone never
 * grants mutation; the capability verdict (resolved separately by the
 * demo chain) is the only gate to the apply step.
 */
export interface OwnerActorContext extends OwnerActor {
  /** Always true on this route. Rendered on every demo-owner affordance. */
  demoOwnerContext: true;
}"""
assert old in s, "actor types"
s = s.replace(old, new)

old = """export interface BoundApproval {
  tenantId: string;
  actor: OwnerActorContext;
  baseStateDigest: string;
  baseViewDigest: string;
  patchDigest: string;
  approvedAt: string;
  eventId: string | null;
  resultDigest: string;
  demoOwnerContext: true;
}"""
new = """export interface BoundApproval {
  tenantId: string;
  actor: OwnerActor;
  baseStateDigest: string;
  baseViewDigest: string;
  patchDigest: string;
  approvedAt: string;
  eventId: string | null;
  resultDigest: string;
  /**
   * Present (literal true) on demo-stamped approvals, absent on future
   * production approvals. Optional so a PING-backed stamper can satisfy
   * this record without claiming demo status.
   */
  demoOwnerContext?: true;
}"""
assert old in s, "approval type"
s = s.replace(old, new)

old = """export function buildBoundApproval(args: {
  tenantId: string;
  actor: OwnerActorContext;
  baseStateDigest: string;
  baseViewDigest: string;
  patchDigest: string;
  eventId: string | null;
  resultDigest: string;
}): BoundApproval {"""
new = """/**
 * The DEMO approval stamper: always stamps demoOwnerContext: true, so a
 * demo approval can never be mistaken for a production authorization. A
 * future PING-backed implementation provides its own stamper (no demo
 * marker) against the same BoundApproval record shape.
 */
export function buildBoundApproval(args: {
  tenantId: string;
  actor: OwnerActor;
  baseStateDigest: string;
  baseViewDigest: string;
  patchDigest: string;
  eventId: string | null;
  resultDigest: string;
}): BoundApproval {"""
assert old in s, "builder"
s = s.replace(old, new)

open(p, "w").write(s)
print("patch-loop.ts future-neutral types patched")

# --- owner-context.ts: general actor type + factory. ---
p = "src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts"
s = open(p).read()

old = """import { demoActorContext, type OwnerActorContext } from "./patch-loop";"""
new = """import {
  demoActorContext,
  type OwnerActor,
  type OwnerActorContext,
} from "./patch-loop";"""
assert old in s, "ctx imports"
s = s.replace(old, new)

old = """  /** The acting owner actor. Demo: the seeded demo actor, labeled as such. */
  readonly actor: OwnerActorContext;"""
new = """  /**
   * The acting owner actor, future-neutral. Demo: the seeded demo actor,
   * labeled as such (an OwnerActorContext with demoOwnerContext: true).
   * A PING-backed implementation supplies a verified owner identity with
   * no demo marker.
   */
  readonly actor: OwnerActor;"""
assert old in s, "ctx actor"
s = s.replace(old, new)

old = """/**
 * DemoOwnerContext: the only OwnerContext implementation until real owner
 * auth exists. Tenant scoping comes from requireTenantContext (refused
 * before any I/O); the capability verdict comes from the seeded demo
 * chain (authentication alone never grants mutation); every label says
 * DEMO OWNER CONTEXT.
 */"""
new = """/**
 * The single construction point for the route's OwnerContext. The route
 * calls this factory and nothing else: replacing the demo implementation
 * with a PING identity/capability implementation means changing this
 * factory's body, not the route and not the call sites. Until real owner
 * auth exists it returns the demo implementation, and every response it
 * stamps discloses that.
 */
export async function createOwnerContext(
  tenantId: string,
): Promise<OwnerContext> {
  return DemoOwnerContext.forTenant(tenantId);
}

/**
 * The refusal label for failures that happen before any context exists
 * (e.g. an invalid tenant id). No response from the route may leave
 * unlabeled; the label comes from the seam, never from the route.
 */
export function ownerContextRefusalLabel(): {
  demoOwnerContext: true;
  demoNote: string;
} {
  return DemoOwnerContext.label();
}

/**
 * DemoOwnerContext: the only OwnerContext implementation until real owner
 * auth exists. Tenant scoping comes from requireTenantContext (refused
 * before any I/O); the capability verdict comes from the seeded demo
 * chain (authentication alone never grants mutation); every label says
 * DEMO OWNER CONTEXT.
 */"""
assert old in s, "factory"
s = s.replace(old, new)

open(p, "w").write(s)
print("owner-context.ts factory patched")

# --- route.ts: go through the factory; no direct Demo references. ---
p = "src/app/api/fyd/objects/[objectId]/overrides/route.ts"
s = open(p).read()

old = 'import { DemoOwnerContext, type OwnerContext } from "./owner-context";'
new = """import {
  createOwnerContext,
  ownerContextRefusalLabel,
  type OwnerContext,
} from "./owner-context";"""
assert old in s, "route imports"
s = s.replace(old, new)

old = """  // G4: the tenant comes from the trusted route path. The object id IS the
  // site id (listObjectIds serves the PING-backed site projections), so the
  // OwnerContext is constructed server-side here, before any I/O, through
  // the single owner-context seam (DemoOwnerContext today; a PING
  // identity/capability implementation later, without touching this route).
  // Even the invalid-tenant refusal is stamped with the demo label via
  // DemoOwnerContext.label(): no response leaves this route unlabeled.
  let ctx: OwnerContext;
  try {
    ctx = await DemoOwnerContext.forTenant(objectId);
  } catch (err) {
    if (err instanceof TenantContextError) {
      return NextResponse.json(
        {
          ...DemoOwnerContext.label(),"""
new = """  // G4: the tenant comes from the trusted route path. The object id IS the
  // site id (listObjectIds serves the PING-backed site projections), so the
  // OwnerContext is constructed server-side here, before any I/O, through
  // the single owner-context seam: createOwnerContext (DemoOwnerContext
  // today; a PING identity/capability implementation later, by changing
  // the factory body alone - this route does not change).
  // Even the invalid-tenant refusal is stamped with the seam's refusal
  // label: no response leaves this route unlabeled.
  let ctx: OwnerContext;
  try {
    ctx = await createOwnerContext(objectId);
  } catch (err) {
    if (err instanceof TenantContextError) {
      return NextResponse.json(
        {
          ...ownerContextRefusalLabel(),"""
assert old in s, "route construction"
s = s.replace(old, new)

old = """ * G4 (tenant from the trusted path): the object id IS the site id, so the
 * OwnerContext is constructed server-side from the route param via
 * DemoOwnerContext.forTenant (the single owner-context seam). Any"""
new = """ * G4 (tenant from the trusted path): the object id IS the site id, so the
 * OwnerContext is constructed server-side from the route param via
 * createOwnerContext (the single owner-context seam). Any"""
assert old in s, "route header"
s = s.replace(old, new)

open(p, "w").write(s)
print("route.ts factory patched")
