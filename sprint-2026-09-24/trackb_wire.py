#!/usr/bin/env python3
"""Track B: wire the typed authorization seam into DemoOwnerContext and the
customize route. No new authority: both reuse demoAuthorizationAuthority."""
import sys

# ---- 1. owner-context.ts: DemoOwnerContext.evaluateCapability ----
P1 = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts"
src = open(P1).read()

old_import = """import {
  chainAuditView,
  resolveOwnerCorrectionChain,
  type OwnerCorrectionChain,
} from "@/fyd/owner-mode/demo-chain";
"""
new_import = """import {
  chainAuditView,
  resolveOwnerCorrectionChain,
  type OwnerCorrectionChain,
} from "@/fyd/owner-mode/demo-chain";
import {
  answerAuthorization,
  demoAuthorizationQuestion,
  listOwnerCapabilities,
  type DemoActor,
  type OwnerCapability,
} from "@/fyd/owner-mode/capability";
import { resolveOwnerIdentity } from "@/fyd/owner-mode/owner-identity";
"""
assert src.count(old_import) == 1, f"owner-context import anchor: {src.count(old_import)}"
src = src.replace(old_import, new_import, 1)

old_eval = """  async evaluateCapability(
    _objectId: string,
    _capability: string,
  ): Promise<OwnerCapabilityEvaluation> {
    // Demo: the verdict comes from the seeded demo chain, which evaluates
    // owner.correct-fact for the seeded actor. The capability argument is
    // part of the interface for the future PING implementation; the demo
    // chain knows only owner.correct-fact.
    return {
      capability: this.chain.verdict.capability,
      allowed: this.chain.verdict.allowed,
      reason: this.chain.verdict.reason,
    };
  }
"""
new_eval = """  async evaluateCapability(
    objectId: string,
    capability: string,
  ): Promise<OwnerCapabilityEvaluation> {
    // The typed authorization question carries the full ask: actor,
    // identity, control relationship, capability, resource, and action.
    // The demo authority answers from the hard-coded demo relationship
    // mapping plus the capability rules (the single demo authority; no
    // new authority class). Unknown capabilities fail closed.
    const known = listOwnerCapabilities() as string[];
    if (!known.includes(capability)) {
      return {
        capability,
        allowed: false,
        reason:
          "demo: deny - '" +
          capability +
          "' is not a demo capability (deny-by-default).",
      };
    }
    const actor: DemoActor = { id: this.actor.id, label: this.actor.label };
    const action = capability.includes(".")
      ? capability.slice(capability.indexOf(".") + 1)
      : capability;
    const answer = answerAuthorization(
      demoAuthorizationQuestion(
        actor,
        this.tenantId,
        capability as OwnerCapability,
        action,
        await resolveOwnerIdentity(),
        objectId,
      ),
    );
    return {
      capability: answer.capability,
      allowed: answer.allowed,
      reason:
        answer.reason + " [demo scaffolding; " + answer.identityNote + "]",
    };
  }
"""
assert src.count(old_eval) == 1, f"owner-context eval anchor: {src.count(old_eval)}"
src = src.replace(old_eval, new_eval, 1)
open(P1, "w").write(src)
print("owner-context.ts: evaluateCapability wired through the typed seam")

# ---- 2. customize/route.ts: demoDenied threads siteId + action ----
P2 = "/home/nolan/projects/ping/src/app/api/fyd/customize/route.ts"
src = open(P2).read()

old_imp = """import {
  DEMO_OWNER_ACTOR,
  evaluateCapability,
  resolveDemoRelationship,
} from "@/fyd/owner-mode/capability";
"""
new_imp = """import {
  DEMO_OWNER_ACTOR,
  answerAuthorization,
  demoAuthorizationQuestion,
} from "@/fyd/owner-mode/capability";
import { resolveOwnerIdentity } from "@/fyd/owner-mode/owner-identity";
"""
assert src.count(old_imp) == 1, f"customize import anchor: {src.count(old_imp)}"
src = src.replace(old_imp, new_imp, 1)

old_sig = "function demoDenied(req: Request) {"
new_sig = "async function demoDenied(req: Request, siteId: string, action: string) {"
assert src.count(old_sig) == 1, f"customize sig anchor: {src.count(old_sig)}"
src = src.replace(old_sig, new_sig, 1)

old_verdict = """  const verdict = evaluateCapability(
    DEMO_OWNER_ACTOR,
    resolveDemoRelationship("", DEMO_OWNER_ACTOR),
    "owner.customize-approve",
  );
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "capability_denied",
        error: "Capability denied: " + verdict.reason,
        demoOwnerMode: enabled,
      },
      { status: 403 },
    );
  }
  return null;
"""
new_verdict = """  // The typed authorization question carries the actual site resource
  // and the requested action (inspect/approve/clear). The demo authority
  // answers from the hard-coded demo relationship mapping plus the
  // capability rules; the answer is stamped as demo scaffolding with an
  // explicitly unverified identity.
  const answer = answerAuthorization(
    demoAuthorizationQuestion(
      DEMO_OWNER_ACTOR,
      siteId,
      "owner.customize-approve",
      action,
      await resolveOwnerIdentity(),
    ),
  );
  if (!answer.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "capability_denied",
        error: "Capability denied: " + answer.reason,
        demoOwnerMode: enabled,
        demoScaffolding: answer.demoScaffolding,
        identityNote: answer.identityNote,
      },
      { status: 403 },
    );
  }
  return null;
"""
assert src.count(old_verdict) == 1, f"customize verdict anchor: {src.count(old_verdict)}"
src = src.replace(old_verdict, new_verdict, 1)

# Call sites: disambiguate by surrounding context.
old_get = """  // hidden-section decisions. Same gate as the POST owner actions.
  const gate = demoDenied(req);
"""
new_get = """  // hidden-section decisions. Same gate as the POST owner actions.
  const gate = await demoDenied(req, siteId, "inspect");
"""
assert src.count(old_get) == 1, f"customize GET anchor: {src.count(old_get)}"
src = src.replace(old_get, new_get, 1)

old_approve = """  requestId: string,
) {
  const gate = demoDenied(req);
  if (gate) return gate;

  const { ledger, locks, storeDir } = writeBoundaryStore();
  const digest = canonicalPayloadDigest({ action: "approve", siteId, text, proposal: clientProposal });
"""
new_approve = """  requestId: string,
) {
  const gate = await demoDenied(req, siteId, "approve");
  if (gate) return gate;

  const { ledger, locks, storeDir } = writeBoundaryStore();
  const digest = canonicalPayloadDigest({ action: "approve", siteId, text, proposal: clientProposal });
"""
assert src.count(old_approve) == 1, f"customize approve anchor: {src.count(old_approve)}"
src = src.replace(old_approve, new_approve, 1)

old_clear = """async function handleClear(req: Request, siteId: string, intentId: string, requestId: string) {
  const gate = demoDenied(req);
"""
new_clear = """async function handleClear(req: Request, siteId: string, intentId: string, requestId: string) {
  const gate = await demoDenied(req, siteId, "clear");
"""
assert src.count(old_clear) == 1, f"customize clear anchor: {src.count(old_clear)}"
src = src.replace(old_clear, new_clear, 1)

open(P2, "w").write(src)
print("customize/route.ts: demoDenied threads siteId + action through the seam")
print("OK")
