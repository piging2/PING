/**
 * Lane T proof: three action plans against a REAL FYD factory demo object.
 * Target: biz-clearwater ("Clearwater Plumbing Co.") from the FYD factory's
 * clearwater-plumbing-demo fixture (read-only mirror via lane G's spike).
 * Capability records below are what lane S would resolve for this object
 * (first-party tel: anchor + schema.org telephone + mailto:, all SUPPORTED).
 *
 * PROOF A: safe read-only plan -> direct gates only, NO approval needed.
 * PROOF B: owner-scoped mutation plan -> propose gate, approval binds the
 *          EXACT plan digest; tamper one argument -> approval goes STALE.
 * PROOF C: refused plan -> visitor may not perform an owner intent; the
 *          refusal cites the exact policy rule (FORBIDDEN.not_owner),
 *          not a hallucinated alternative.
 *
 * Usage: node proof.js   (exit 0 = all three proofs hold)
 */
"use strict";

const { planAction } = require("./planner");
const { FORBIDDEN } = require("./policy");

// ---- Factory demo object (read-only; never mutated by the planner) ----
const BIZ_CLEARWATER = {
  id: "biz-clearwater",
  title: "Clearwater Plumbing Co.",
  schema: "ping.social.business@1",
  controllerId: "id:owner-clearwater",
};

// ---- Capability records: lane-T consumed shape, resolved per lane S ----
// (S record -> T shape mapping is recorded in STATE.md; statuses here are
//  lane S "resolved", which the planner consumes.)
const CLEARWATER_CAPS = [
  {
    id: "cap_9f2ac41d7e30b1aa", kind: "phone", objectId: BIZ_CLEARWATER.id,
    label: "Phone", valueRef: "(970) 555-0142",
    evidence: { state: "observed", receipt: "the business website header + schema.org telephone", steps: [], asOf: "2026-09-20" },
    lastChecked: "2026-09-20", status: "active", grantRequired: null, limits: {},
  },
  {
    id: "cap_77b0e55c19ad02f4", kind: "email", objectId: BIZ_CLEARWATER.id,
    label: "Email", valueRef: "hello@clearwater.example",
    evidence: { state: "observed", receipt: "the business website footer mailto:", steps: [], asOf: "2026-09-20" },
    lastChecked: "2026-09-20", status: "active", grantRequired: null, limits: {},
  },
];

const PRINCIPALS = {
  visitor: { kind: "visitor", viewerId: "id:visitor-7" },
  owner: { kind: "owner", viewerId: "id:owner-clearwater" },
};

function ctx(principal, capabilities = CLEARWATER_CAPS) {
  return {
    targetObjectId: BIZ_CLEARWATER.id,
    targetTitle: BIZ_CLEARWATER.title,
    controllerId: BIZ_CLEARWATER.controllerId,
    principal,
    grants: [],
    forbiddenEffects: ["purchase.make", "ad.buy"],
    capabilities,
  };
}

// ---- Approval binding: approval signs the EXACT plan digest. ----
function approve(plan) {
  return { planDigest: plan.digest, principal: plan.principal, boundAt: "2026-09-23T20:30:00Z" };
}
function verifyApproval(plan, approval) {
  if (approval.planDigest === plan.digest) return { ok: true };
  return {
    ok: false,
    reason: `STALE: approval binds digest ${approval.planDigest.slice(0, 12)} but the plan digest is ${plan.digest.slice(0, 12)}. The proposal changed; approval does not carry over.`,
  };
}

let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : " :: " + detail}`);
  if (!cond) failures++;
}

console.log(`target object: ${BIZ_CLEARWATER.id} ("${BIZ_CLEARWATER.title}")  controller: ${BIZ_CLEARWATER.controllerId}\n`);

// ============ PROOF A: safe read-only plan (visitor, "call them") ============
{
  const plan = planAction("call them", ctx(PRINCIPALS.visitor));
  const cands = plan.steps.flatMap((s) => s.candidates);
  console.log(`A  digest: ${plan.digest.slice(0, 16)}  planId: ${plan.planId}`);
  check("A: one direct candidate on the demo object", cands.length === 1 && cands[0].gate === "direct", JSON.stringify(cands));
  check("A: candidate is evidence-backed phone", cands[0].capabilityId === "cap_9f2ac41d7e30b1aa" && /the business website/.test(cands[0].reason), JSON.stringify(cands[0]));
  check("A: NO approval needed (zero confirmation gates)", plan.confirmationGates.length === 0, `${plan.confirmationGates.length} gates emitted`);
  check("A: no invented contact value", !JSON.stringify(plan).includes("555-0199"), "injected value leaked");
  console.log("");
}

// ============ PROOF B: owner mutation plan + approval binding + tamper ============
{
  const plan = planAction("update my hours to 8 AM to 5 PM", ctx(PRINCIPALS.owner));
  const gate = plan.confirmationGates[0];
  console.log(`B  digest: ${plan.digest.slice(0, 16)}  gate: ${gate ? gate.gateId : "none"}`);
  check("B: owner mutation becomes a propose gate", !!gate && gate.requiresPrincipal === "owner", JSON.stringify(plan.confirmationGates));
  check("B: gate digest binds the exact plan digest", !!gate && gate.digest === plan.digest, gate && gate.digest);
  check("B: card shows exact before/after", !!gate && /8 am to 5 pm/i.test(gate.card.after.join(" ")), gate && JSON.stringify(gate.card.after));

  // Owner approves THIS exact proposal.
  const approval = approve(plan);
  check("B: approval verifies on the untampered plan", verifyApproval(plan, approval).ok, "valid approval rejected");

  // Tamper with ONE argument: the value changes from 8-5 to 9-6.
  const tampered = planAction("update my hours to 9 AM to 6 PM", ctx(PRINCIPALS.owner));
  const v = verifyApproval(tampered, approval);
  console.log(`B  tampered digest: ${tampered.digest.slice(0, 16)}`);
  check("B: tampered plan has a DIFFERENT digest", tampered.digest !== plan.digest, "digest collision after tamper");
  check("B: approval goes STALE after one-argument tamper", !v.ok, "approval survived the tamper");
  if (!v.ok) console.log(`   ${v.reason}`);
  console.log("");
}

// ============ PROOF C: refused plan (visitor may not publish) ============
{
  const plan = planAction("publish my site changes", ctx(PRINCIPALS.visitor));
  const expected = `Refused: ${FORBIDDEN.not_owner}`;
  console.log(`C  digest: ${plan.digest.slice(0, 16)}`);
  check("C: zero candidates for a non-owner owner intent", plan.steps.every((s) => s.candidates.length === 0), JSON.stringify(plan.steps));
  check("C: refusal cites the EXACT policy rule", plan.refused.some((r) => r.reason === expected), JSON.stringify(plan.refused));
  check("C: no hallucinated alternative proposed", !plan.fallbacks.some((f) => /publish/i.test(f.plan)), JSON.stringify(plan.fallbacks));
  console.log(`   cited rule: "${expected}"`);
  console.log("");
}

console.log(failures === 0 ? "ALL THREE PROOFS HOLD" : `${failures} PROOF(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
