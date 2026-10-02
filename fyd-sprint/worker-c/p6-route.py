p = "src/app/api/fyd/objects/[objectId]/overrides/route.ts"
s = open(p).read()

# --- 1. Header docs: describe the OwnerContext seam. ---
old = """ * G4 (tenant from the trusted path): the object id IS the site id, so the
 * TenantContext is constructed server-side from the route param via
 * requireTenantContext. Any body-supplied tenant identity (siteId /
 * tenantId / tenant keys) that disagrees with the route tenant is REFUSED
 * with 400 tenant_mismatch. A tenant mismatch never serves another
 * tenant's object."""
new = """ * G4 (tenant from the trusted path): the object id IS the site id, so the
 * OwnerContext is constructed server-side from the route param via
 * DemoOwnerContext.forTenant (the single owner-context seam). Any
 * body-supplied tenant identity (siteId / tenantId / tenant keys) that
 * disagrees with the route tenant is REFUSED with 400 tenant_mismatch.
 * A tenant mismatch never serves another tenant's object."""
assert old in s, "doc1"
s = s.replace(old, new)

old = """ * DEMO/DEV ONLY: there is no production authentication on this route. It is
 * the seam where real owner auth will attach; until that lane exists, every
 * response carries demoOwnerContext: true and the actor disclosure, and the
 * Manage surface labels every session DEV/DEMO. This route must not be
 * treated as a production owner API.
 *
 * The approve stage enforces the owner-core chain:
 *   SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY
 *     -> PROPOSE/APPLY RULE -> EVENT -> PROJECTION.
 * resolveOwnerCorrectionChain (src/fyd/owner-mode/demo-chain.ts) evaluates
 * the chain; a denied owner.correct-fact verdict returns 403 and nothing
 * is written. The ActorContext is required on every mutation: it is always
 * the seeded demo actor, labeled as DEMO OWNER CONTEXT. Authentication
 * alone NEVER grants mutation."""
new = """ * DEMO/DEV ONLY: there is no production authentication on this route. It is
 * the seam where real owner auth will attach; until that lane exists, every
 * response is stamped through the OwnerContext seam with demoOwnerContext:
 * true plus the actor disclosure, and the Manage surface labels every
 * session DEV/DEMO. This route must not be treated as a production owner
 * API.
 *
 * The approve stage enforces the owner-core chain:
 *   SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY
 *     -> PROPOSE/APPLY RULE -> EVENT -> PROJECTION.
 * ctx.evaluateCapability evaluates the chain through the OwnerContext
 * seam; a denied owner.correct-fact verdict returns 403 and nothing is
 * written. The OwnerContext is required on every mutation: the actor is
 * always the seeded demo actor, labeled as DEMO OWNER CONTEXT.
 * Authentication alone NEVER grants mutation."""
assert old in s, "doc2"
s = s.replace(old, new)

# --- 2. Imports: drop the trio's direct imports, import the seam. ---
old = """import {
  chainAuditView,
  resolveOwnerCorrectionChain,
} from "@/fyd/owner-mode/demo-chain";
import {
  requireTenantContext,
  TenantContextError,
} from "@/fyd/tenant/tenant-context";"""
new = """import { TenantContextError } from "@/fyd/tenant/tenant-context";"""
assert old in s, "imports1"
s = s.replace(old, new)

old = """import {
  buildBoundApproval,
  buildPatchPreview,
  buildViewDigest,
  demoActorContext,
  digestOf,
  lastEventId,
  ownerStateDigest,
  patchDigestOf,
} from "./patch-loop";"""
new = """import {
  buildBoundApproval,
  buildPatchPreview,
  buildViewDigest,
  digestOf,
  lastEventId,
  ownerStateDigest,
  patchDigestOf,
} from "./patch-loop";
import { DemoOwnerContext, type OwnerContext } from "./owner-context";"""
assert old in s, "imports2"
s = s.replace(old, new)

# --- 3. Remove the standalone demoLabel(): the seam stamps every response. ---
old = """/**
 * Every JSON response from this route, success or error, carries the demo
 * owner-context label. In demo mode the actor is seeded server-side and no
 * owner identity is verified: the label is the honesty mechanism, not a
 * decorative banner, so it must be impossible to get a response from this
 * route that does not identify the demo context.
 */
function demoLabel() {
  return {
    demoOwnerContext: true as const,
    demoNote:
      "DEMO OWNER CONTEXT: mutations on this route run as a seeded demo " +
      "actor. No owner identity was verified. Not a production owner API.",
  };
}

"""
assert old in s, "demoLabel"
s = s.replace(old, "")

# --- 4. tenantMismatchResponse takes the context. ---
old = """function tenantMismatchResponse(tenantId: string, key: string, claimed: string) {
  return NextResponse.json(
    {
      ...demoLabel(),
      ok: false,
      code: "tenant_mismatch",
      error:
        "Tenant identity comes from the request route, not the request body: " +
        "the body claimed tenant \\"" +
        claimed +
        "\\" under key \\"" +
        key +
        "\\" while the route serves tenant \\"" +
        tenantId +
        "\\". The request was refused; nothing was served or written for the claimed tenant.",
      tenantId,
      rejectedKey: key,
    },
    { status: 400 },
  );
}"""
new = """function tenantMismatchResponse(ctx: OwnerContext, key: string, claimed: string) {
  return NextResponse.json(
    {
      ...ctx.responseLabel(),
      ok: false,
      code: "tenant_mismatch",
      error:
        "Tenant identity comes from the request route, not the request body: " +
        "the body claimed tenant \\"" +
        claimed +
        "\\" under key \\"" +
        key +
        "\\" while the route serves tenant \\"" +
        ctx.tenantId +
        "\\". The request was refused; nothing was served or written for the claimed tenant.",
      tenantId: ctx.tenantId,
      rejectedKey: key,
    },
    { status: 400 },
  );
}"""
assert old in s, "mismatch"
s = s.replace(old, new)

# --- 5. Build the OwnerContext first, from the trusted route path. ---
old = """  // G4: the tenant comes from the trusted route path. The object id IS the
  // site id (listObjectIds serves the PING-backed site projections), so the
  // TenantContext is constructed server-side here, before any I/O.
  let tenantId: string;
  try {
    tenantId = requireTenantContext({ tenantId: objectId });
  } catch (err) {
    if (err instanceof TenantContextError) {
      return NextResponse.json(
        {
          ...demoLabel(),
          ok: false,
          code: "invalid_tenant",
          error:
            "Refusing to act: the route object id is not a valid tenant id. " +
            "Tenant ids are DNS-safe slugs.",
        },
        { status: 400 },
      );
    }
    throw err;
  }"""
new = """  // G4: the tenant comes from the trusted route path. The object id IS the
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
          ...DemoOwnerContext.label(),
          ok: false,
          code: "invalid_tenant",
          error:
            "Refusing to act: the route object id is not a valid tenant id. " +
            "Tenant ids are DNS-safe slugs.",
        },
        { status: 400 },
      );
    }
    throw err;
  }"""
assert old in s, "ctx build"
s = s.replace(old, new)

# --- 6. Route-param references to the old tenantId variable. ---
old = """  if (!loadObjectView(objectId)) {
    return NextResponse.json({ ...demoLabel(), ok: false, error: "Unknown object." }, { status: 404 });
  }"""
new = """  if (!loadObjectView(objectId)) {
    return NextResponse.json({ ...ctx.responseLabel(), ok: false, error: "Unknown object." }, { status: 404 });
  }"""
assert old in s, "404"
s = s.replace(old, new)

old = """    if (typeof claimed === "string" && claimed.trim().length > 0 && claimed.trim() !== tenantId) {
      return tenantMismatchResponse(tenantId, key, claimed.trim());
    }"""
new = """    if (typeof claimed === "string" && claimed.trim().length > 0 && claimed.trim() !== ctx.tenantId) {
      return tenantMismatchResponse(ctx, key, claimed.trim());
    }"""
assert old in s, "mismatch call"
s = s.replace(old, new)

# --- 7. All remaining demoLabel() spreads go through the seam. ---
assert "...demoLabel()" in s
s = s.replace("...demoLabel()", "...ctx.responseLabel()")
assert "demoLabel" not in s, "demoLabel fully gone"

# --- 8. Propose stage: capability evaluation through the seam. ---
old = """    // Capability impact is a pure evaluation: the chain performs no
    // mutation and writes nothing.
    const chain = await resolveOwnerCorrectionChain(objectId);
    const actor = demoActorContext(chain.actor.id, chain.actor.label);
    const capabilityImpact =
      "Capability " +
      chain.verdict.capability +
      ": " +
      (chain.verdict.allowed ? "ALLOWED" : "DENIED") +
      " under DEMO OWNER CONTEXT. " +
      chain.verdict.reason;"""
new = """    // Capability impact is a pure evaluation through the OwnerContext
    // seam: it performs no mutation and writes nothing.
    const evaluation = await ctx.evaluateCapability(objectId, "owner.correct-fact");
    const actor = ctx.actor;
    const capabilityImpact = ctx.capabilityImpactLine(evaluation);"""
assert old in s, "propose chain"
s = s.replace(old, new)

old = """    return NextResponse.json({
      ...ctx.responseLabel(),
      ok: true,
      tenantId,
      actorDisclosure: actor.disclosure,
      proposal: { command, summary: proposal.summary },
      preview,
      digests: {
        baseStateDigest: ownerStateDigest(objectId),
        baseViewDigest: buildViewDigest(objectId),
        patchDigest: patchDigestOf(command),
      },
      chain: chainAuditView(chain),
    });"""
new = """    return NextResponse.json({
      ...ctx.responseLabel(),
      ok: true,
      tenantId: ctx.tenantId,
      actorDisclosure: actor.disclosure,
      proposal: { command, summary: proposal.summary },
      preview,
      digests: {
        baseStateDigest: ownerStateDigest(objectId),
        baseViewDigest: buildViewDigest(objectId),
        patchDigest: patchDigestOf(command),
      },
      chain: ctx.auditView(),
    });"""
assert old in s, "propose response"
s = s.replace(old, new)

# --- 9. Approve stage: capability gate through the seam. ---
old = """      // SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY.
      // The verdict is the only gate to the apply step: authentication
      // alone never grants mutation. Denied -> 403, nothing written.
      // The ActorContext is required on every mutation: it is always the
      // seeded demo actor, labeled DEMO OWNER CONTEXT.
      const chain = await resolveOwnerCorrectionChain(objectId);
      const audit = chainAuditView(chain);
      const actor = demoActorContext(chain.actor.id, chain.actor.label);
      console.info(
        "[fyd-owner-audit]",
        JSON.stringify({ objectId, command: command.type, tenantId, ...audit }),
      );
      if (!chain.verdict.allowed) {
        return NextResponse.json(
          {
            ...ctx.responseLabel(),
            ok: false,
            code: "capability_denied",
            error: "Capability denied: " + chain.verdict.reason,
            chain: audit,
          },
          { status: 403 },
        );
      }"""
new = """      // SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY.
      // The verdict is the only gate to the apply step: authentication
      // alone never grants mutation. Denied -> 403, nothing written.
      // The OwnerContext is required on every mutation: the actor is always
      // the seeded demo actor, labeled DEMO OWNER CONTEXT.
      const evaluation = await ctx.evaluateCapability(objectId, "owner.correct-fact");
      const audit = ctx.auditView();
      const actor = ctx.actor;
      console.info(
        "[fyd-owner-audit]",
        JSON.stringify({ objectId, command: command.type, tenantId: ctx.tenantId, ...audit }),
      );
      if (!evaluation.allowed) {
        return NextResponse.json(
          {
            ...ctx.responseLabel(),
            ok: false,
            code: "capability_denied",
            error: "Capability denied: " + evaluation.reason,
            chain: audit,
          },
          { status: 403 },
        );
      }"""
assert old in s, "approve chain"
s = s.replace(old, new)

# --- 10. Contact commands (correction AND confirmation) get the server-read
# --- source value + actor label, so the record keeps SOURCE SAYS X. ---
old = """      // Contact corrections need two things only the server can attach
      // honestly: (1) the SOURCE's current value, read from the raw
      // projection (overlay off) at approval time, so the record keeps
      // SOURCE SAYS X even if the source changes later; (2) the authority
      // label the correction is recorded under. In demo mode this is the
      // seeded demo actor from the chain: an explicit non-identity, never
      // a verified identity. The chain audit above labels it demo
      // scaffolding; this field is the seam where real owner identity
      // will attach.
      let opts: { sourceValue?: string | null; actorLabel?: string } | undefined;
      if (command.type === "set-contact-field") {"""
new = """      // Contact corrections and confirmations need two things only the
      // server can attach honestly: (1) the SOURCE's current value, read
      // from the raw projection (overlay off) at approval time, so the
      // record keeps SOURCE SAYS X even if the source changes later (a
      // confirmation records it for drift detection); (2) the authority
      // label the correction is recorded under. In demo mode this is the
      // seeded demo actor from the OwnerContext: an explicit non-identity,
      // never a verified identity. The chain audit above labels it demo
      // scaffolding; this field is the seam where real owner identity
      // will attach.
      let opts: { sourceValue?: string | null; actorLabel?: string } | undefined;
      if (command.type === "set-contact-field" || command.type === "confirm-contact-field") {"""
assert old in s, "opts"
s = s.replace(old, new)

# --- 11. Bound approval binds the seam's tenant id. ---
old = """      const approval = buildBoundApproval({
        tenantId,
        actor,"""
new = """      const approval = buildBoundApproval({
        tenantId: ctx.tenantId,
        actor,"""
assert old in s, "approval tenant"
s = s.replace(old, new)

# --- 12. No stray tenantId variable references remain (the TENANT_CLAIM_KEYS
# --- string literal is expected and untouched). ---
import re
strays = [
  l
  for l in s.splitlines()
  if not l.lstrip().startswith("*")
  and re.search(r"(?<![\w.\"'])tenantId(?![\w\"':])", l)
]
assert not strays, "stray tenantId refs: " + str(strays)
assert "resolveOwnerCorrectionChain" not in s
assert "chainAuditView" not in s
assert "demoActorContext" not in s
assert "requireTenantContext" not in s

open(p, "w").write(s)
print("route.ts patched")
