/**
 * Lane T spike: synthetic run. Prints plans for the worked examples.
 * Usage: node run.js
 */
"use strict";

const { planAction } = require("./planner");
const { ctx, PRINCIPALS, HAPPY_PLACE_CAPS, HAPPY_PLACE_CAPS_WITH_BOOKING } = require("./fixtures");

function summarize(plan) {
  const lines = [];
  lines.push(`Q: ${plan.question}`);
  lines.push(`planId: ${plan.planId}  digest: ${plan.digest.slice(0, 16)}...`);
  for (const step of plan.steps) {
    lines.push(`  step [${step.intent}] status=${step.status}`);
    if (step.clarificationQuestion) lines.push(`    clarify: ${step.clarificationQuestion}`);
    for (const c of step.candidates) {
      lines.push(`    - ${c.capabilityId} route=${c.route} gate=${c.gate} rank=${c.rank}`);
      lines.push(`      reason: ${c.reason}`);
    }
  }
  for (const g of plan.confirmationGates) {
    lines.push(`  GATE ${g.gateId} for ${g.candidateRef} (digest ${g.digest.slice(0, 12)}...) requires=${g.requiresPrincipal}`);
    lines.push(`    card: ${g.card.title} | approve="${g.card.approveLabel}"`);
    for (const w of g.card.what) lines.push(`    what: ${w}`);
  }
  for (const f of plan.fallbacks) lines.push(`  fallback: when ${f.when} -> ${f.plan}`);
  for (const r of plan.refused) lines.push(`  REFUSED ${r.capabilityId || "(none)"}: ${r.reason}`);
  return lines.join("\n");
}

const cases = [
  ["contact them", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS)],
  ["call them", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS)],
  ["book the soonest slot", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS_WITH_BOOKING)],
  ["update my hours", ctx(PRINCIPALS.owner, HAPPY_PLACE_CAPS)],
  ["update my hours", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS)],
  ["get a quote for a deck", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS)],
  ["what services do they offer", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS)],
];

for (const [q, c] of cases) {
  console.log(summarize(planAction(q, c)));
  console.log("---");
}

// Determinism check: same inputs -> identical digest.
const a = planAction("contact them", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS));
const b = planAction("contact them", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS));
console.log(`determinism: ${a.digest === b.digest ? "PASS" : "FAIL"} (${a.digest.slice(0, 16)})`);
// Gate digests bind the plan digest.
const gated = planAction("book the soonest slot", ctx(PRINCIPALS.visitor, HAPPY_PLACE_CAPS_WITH_BOOKING));
console.log(`gate-binds-plan: ${gated.confirmationGates.every((g) => g.digest === gated.digest) ? "PASS" : "FAIL"}`);
