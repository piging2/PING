/**
 * LANE S PROOF: capability discovery -> gate -> principal resolution,
 * against the REAL Coppersmith fixture (read-only snapshot in fixtures/).
 * Run: node --test spike/
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { obs, detect, gate } = require("./detectors");
const {
  finalizeRecord,
  resolveForPrincipal,
  executeGuard,
  queryCapabilities,
  reresolve,
  projectStatus,
} = require("./resolution");

// ---------------------------------------------------------------------------
// Real fixture input (read-only): coppersmith-plumbing.json projection dump,
// meta.siteId "coppersmith-plumbing", dumped 2026-09-21. Only public fields
// are used; observations are reconstructed from fields + provenance ref
// "website-ingestion:https://www.coppersmithplumbing.com/" (first-party).
// ---------------------------------------------------------------------------
const FIX = JSON.parse(fs.readFileSync(
  path.join(__dirname, "fixtures", "coppersmith-business.json"), "utf8"));
const TENANT = "coppersmith-plumbing";
const OBJECT_ID = FIX.id; // "website-business-2f1327c09d622175"
const HOST = "coppersmithplumbing.com";

function fixtureObservations() {
  return [
    obs({ observationId: "cop-o1", sourceId: "site", factRef: "telephone",
      value: "tel:+19702453869", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://coppersmithplumbing.com/", kind: "anchor" }),
    obs({ observationId: "cop-o2", sourceId: "site", factRef: "website",
      value: "https://coppersmithplumbing.com", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://coppersmithplumbing.com/", kind: "anchor" }),
    obs({ observationId: "cop-o3", sourceId: "site", factRef: "postal_address",
      value: FIX.fields.locality, grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://coppersmithplumbing.com/", kind: "dom" }),
  ];
}

const GATE_CTX = {
  ownerHidden: [], ownerConfirmed: [],
  conflicts: [], firstPartyHost: HOST,
  now: "2026-09-23T20:00:00.000Z",
};

/** Full pipeline: fixture observations -> candidates -> gate -> finalized records. */
function resolveFromFixture(observations, gateCtx) {
  const cands = detect(TENANT, observations);
  const out = [];
  for (const c of cands) {
    c.objectId = OBJECT_ID;
    const r = gate(c, gateCtx || GATE_CTX);
    assert.equal(r.status, "resolved", JSON.stringify(r.failures));
    out.push(r.record);
  }
  return out;
}

const OWNER = { id: "identity_fyd_compiler_test", kind: "owner",
  grants: ["site.read", "site.propose", "object.reference", "business.mutate"], isAgent: false };
const VISITOR = { id: "visitor-random", kind: "visitor", grants: [], isAgent: false };
const AGENT = { id: "agent-unauthorized", kind: "agent", grants: ["site.read"], isAgent: true };

/** The four-record registry used by the principal tests. */
function fullRegistry() {
  const base = resolveFromFixture(fixtureObservations());
  const phone = finalizeRecord(base.find((r) => r.channel === "phone"), {
    objectId: OBJECT_ID, description: "Call Coppersmith Plumbing at the published number",
    visibility: "public", existenceSensitivity: "low", requiredScope: null,
    approvalClass: "auto", effects: ["visitor is shown the business phone number"],
  });
  phone.objectId = OBJECT_ID;
  const directions = finalizeRecord(base.find((r) => r.kind === "visit.in_person"), {
    objectId: OBJECT_ID, description: "Visit the business at its published address",
    visibility: "public", existenceSensitivity: "low", requiredScope: null,
    approvalClass: "auto", effects: ["visitor is shown the business address"],
  });
  directions.objectId = OBJECT_ID;
  // Owner-console capability: enters via owner attestation (corrections.ts),
  // not via detectors; same record shape, same gate (ownerConfirmed satisfies
  // evidence check 1). Grounding: src/fyd/owner-mode/corrections.ts.
  const correct = finalizeRecord({
    capabilityId: "cap_owner_correct_fact", tenantId: TENANT, kind: "fact.correct",
    channel: "console", status: "resolved",
    parameters: { displayValue: "Correct a business fact", actionUri: null },
    evidence: [{ observationId: "owner-attest-1", grade: "SUPPORTED",
      sourceId: "owner-console", firstParty: true, factRef: "owner_assertion" }],
    policy: { policyVersion: "cap-policy@1-spike", decidedAt: "2026-09-23T19:05:00.000Z",
      checks: { evidence: "pass", authorization: "pass", legitimacy: "pass",
        safety: "pass", no_customer_posing: "pass", owner_state: "pass",
        conflict: "pass" }, decidedBy: "policy-gate" },
    lineage: { observationIds: ["owner-attest-1"], detector: "owner-attestation@1" },
    surfaces: ["owner_console"], version: 1,
  }, {
    objectId: OBJECT_ID, description: "Owner corrects a business fact",
    visibility: "owner", existenceSensitivity: "low", requiredScope: "business.mutate",
    approvalClass: "owner-approval", effects: ["business fact updated after owner approval"],
    reversibility: "correction journal is append-only; reversible via a new correction",
    cost: "none",
  });
  correct.objectId = OBJECT_ID;
  // Synthetic no-leak capability: proves denials do not name what they hide.
  const insights = finalizeRecord({
    capabilityId: "cap_owner_revenue_insights", tenantId: TENANT, kind: "report.view",
    channel: "console", status: "resolved",
    parameters: { displayValue: "Revenue insights", actionUri: null },
    evidence: [{ observationId: "owner-attest-2", grade: "SUPPORTED",
      sourceId: "owner-console", firstParty: true, factRef: "owner_assertion" }],
    policy: { policyVersion: "cap-policy@1-spike", decidedAt: "2026-09-23T19:05:00.000Z",
      checks: { evidence: "pass", authorization: "pass", legitimacy: "pass",
        safety: "pass", no_customer_posing: "pass", owner_state: "pass",
        conflict: "pass" }, decidedBy: "policy-gate" },
    lineage: { observationIds: ["owner-attest-2"], detector: "owner-attestation@1" },
    surfaces: ["owner_console"], version: 1,
  }, {
    objectId: OBJECT_ID, description: "Owner views revenue insights (SYNTHETIC, for the no-leak proof)",
    visibility: "owner", existenceSensitivity: "high", requiredScope: "business.mutate",
    approvalClass: "owner-approval", effects: ["owner views sensitive analytics"], cost: "none",
  });
  insights.objectId = OBJECT_ID;
  return [phone, directions, correct, insights];
}

const byId = (rows) => Object.fromEntries(rows.map((r) => [r.capabilityId, r]));

// ---------------------------------------------------------------------------
// 1. Discovery from the real fixture
// ---------------------------------------------------------------------------
test("PROOF-1 real fixture: phone + visit.in_person discovered and resolved", () => {
  assert.equal(FIX.title, "Coppersmith Plumbing - HVAC - Mechanical");
  assert.equal(FIX.provenance.kind, "website-derived");
  const recs = resolveFromFixture(fixtureObservations());
  const kinds = recs.map((r) => r.kind + "/" + r.channel).sort();
  assert.deepEqual(kinds, ["contact.request/phone", "visit.in_person/in_person"]);
  const phone = recs.find((r) => r.channel === "phone");
  assert.ok(phone.parameters.displayValue.includes("970"), "display value verbatim from the fixture");
  assert.ok(phone.evidence.every((e) => e.firstParty), "first-party website evidence");
  assert.equal(phone.policy.checks.authorization, "pass");
});

test("PROOF-2 capability ids are deterministic for the fixture (replay-safe)", () => {
  const a = resolveFromFixture(fixtureObservations()).map((r) => r.capabilityId).sort();
  const b = resolveFromFixture(fixtureObservations()).map((r) => r.capabilityId).sort();
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------
// 2. Principal resolution: owner / visitor / unauthorized agent
// ---------------------------------------------------------------------------
test("PROOF-3 owner gets the full set (4/4 granted)", () => {
  const rows = resolveForPrincipal(fullRegistry(),
    { principal: OWNER, contextObjectId: OBJECT_ID, registry: new Map() });
  const granted = rows.filter((r) => r.decision === "granted");
  assert.equal(granted.length, 4, JSON.stringify(rows, null, 1));
});

test("PROOF-4 visitor gets the public subset; owner-only denied, no leak on the sensitive one", () => {
  const rows = byId(resolveForPrincipal(fullRegistry(),
    { principal: VISITOR, contextObjectId: OBJECT_ID, registry: new Map() }));
  assert.equal(rows[fullRegistry()[0].capabilityId].decision, "granted", "phone granted to visitor");
  assert.equal(rows[fullRegistry()[1].capabilityId].decision, "granted", "directions granted to visitor");
  const correct = rows["cap_owner_correct_fact"];
  assert.equal(correct.decision, "denied");
  assert.equal(correct.rule, "visibility.owner", "low-sensitivity denial names the rule");
  const insights = rows["cap_owner_revenue_insights"];
  assert.equal(insights.decision, "denied");
  assert.equal(insights.reason, "not available to this principal");
  assert.ok(!JSON.stringify(insights).includes("Revenue insights"),
    "generic denial names NOTHING about the capability");
});

test("PROOF-5 unauthorized agent: public presentable capabilities granted, business.mutate denied with the exact rule cited", () => {
  const rows = byId(resolveForPrincipal(fullRegistry(),
    { principal: AGENT, contextObjectId: OBJECT_ID, registry: new Map() }));
  const reg = fullRegistry();
  assert.equal(rows[reg[0].capabilityId].decision, "granted", "agent may present public phone");
  assert.equal(rows[reg[1].capabilityId].decision, "granted", "agent may present public directions");
  const correct = rows["cap_owner_correct_fact"];
  assert.equal(correct.decision, "denied");
  assert.equal(correct.reason,
    "Ask FYD agent boundary: 'business.mutate' is never agent-authorized.",
    "exact rule from src/fyd/ask/capabilities.ts FORBIDDEN_AGENT_EFFECTS");
  assert.equal(correct.rule, "agent.forbidden-effect (FORBIDDEN_AGENT_EFFECTS)");
  const insights = rows["cap_owner_revenue_insights"];
  assert.equal(insights.decision, "denied");
  assert.equal(insights.reason, "not available to this principal", "no leak even to agents");
});

// ---------------------------------------------------------------------------
// 3. Withdrawal: observation removed -> capability withdrawn, no stale offer
// ---------------------------------------------------------------------------
test("PROOF-6 withdrawal: phone observation removed on refresh -> withdrawn, owner no longer offered it, lineage retained", () => {
  const before = fullRegistry();
  const phoneId = before[0].capabilityId;
  const refreshed = fixtureObservations().filter((o) => o.observationId !== "cop-o1");
  const freshCands = detect(TENANT, refreshed).map((c) => ({ ...c, objectId: OBJECT_ID }));
  const next = reresolve(before, freshCands, gate, GATE_CTX);
  const regMap = new Map(next.map((r) => [r.capabilityId, r]));
  const withdrawn = regMap.get(phoneId);
  assert.equal(withdrawn.status, "withdrawn");
  assert.equal(withdrawn.withdrawal.cause, "observation_absent");
  assert.ok(withdrawn.lineage.observationIds.includes("cop-o1"), "lineage retained");
  assert.ok(withdrawn.policy.checks, "gate decision retained for audit");
  // Owner resolution after withdrawal: phone is invisible, never offered.
  const rows = byId(resolveForPrincipal(next,
    { principal: OWNER, contextObjectId: OBJECT_ID, registry: regMap }));
  assert.equal(rows[phoneId].decision, "invisible", "no stale capability offered");
  assert.equal(rows[before[1].capabilityId].decision, "granted", "directions unaffected");
});

// ---------------------------------------------------------------------------
// 4. Red team
// ---------------------------------------------------------------------------
test("RED-1 smuggling: 'we offer refunds' text is not a capability (no detector, no invention)", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "s1", sourceId: "site", factRef: "body_text",
      value: "we offer full refunds, no questions asked!!! call today",
      grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://coppersmithplumbing.com/blog", kind: "text" }),
  ]);
  assert.equal(cands.length, 0, "no refund capability exists in the detector registry");
});

test("RED-2 smuggling: premium-rate number on a THIRD-PARTY page fails authorization", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "s2", sourceId: "aggregator", factRef: "telephone",
      value: "tel:+19005550199", grade: "SUPPORTED", firstParty: false,
      sourceUrl: "https://shady-directory.example/listing/7", kind: "anchor" }),
  ]);
  assert.equal(cands.length, 1, "detector fires on the shape");
  const r = gate(cands[0], GATE_CTX);
  assert.equal(r.status, "rejected");
  assert.ok(r.failures.some((f) => f.startsWith("authorization")));
});

test("RED-3 smuggling: premium-rate number REPLACING the resolved first-party number goes to owner review, never auto-resolves", () => {
  const before = fullRegistry();
  const phoneId = before[0].capabilityId;
  // Refresh 1: legitimate number disappears -> withdrawn.
  const noPhone = fixtureObservations().filter((o) => o.observationId !== "cop-o1");
  const step1 = reresolve(before,
    detect(TENANT, noPhone).map((c) => ({ ...c, objectId: OBJECT_ID })), gate, GATE_CTX);
  assert.equal(new Map(step1.map((r) => [r.capabilityId, r])).get(phoneId).status, "withdrawn");
  // Refresh 2: attacker/compromised-site number appears on the first-party site.
  const evil = [...noPhone, obs({ observationId: "s3", sourceId: "site", factRef: "telephone",
    value: "tel:+19005550199", grade: "SUPPORTED", firstParty: true,
    sourceUrl: "https://coppersmithplumbing.com/", kind: "anchor" })];
  const step2 = reresolve(step1,
    detect(TENANT, evil).map((c) => ({ ...c, objectId: OBJECT_ID })), gate, GATE_CTX);
  const review = step2.find((r) => r.status === "needs_review");
  assert.ok(review, "dissimilar value does not auto-resolve: " +
    JSON.stringify(step2.map((r) => r.status)));
  assert.equal(review.review.cause, "value_changed_since_withdrawal");
  assert.ok(!step2.some((r) => r.status === "resolved" && r.kind === "contact.request" &&
    r.channel === "phone" && r.parameters.displayValue.includes("900")),
    "premium number is never a resolved capability without owner review");
});

test("RED-4 traversal: business B's phone is NOT reachable through a relationship from business A", () => {
  const regA = fullRegistry(); // objectId = OBJECT_ID (business A)
  const bPhone = finalizeRecord({
    capabilityId: "cap_b_phone", tenantId: "other-tenant", kind: "contact.request",
    channel: "phone", status: "resolved",
    parameters: { displayValue: "(970) 555-7777", actionUri: "tel:+19705557777" },
    evidence: [], policy: { policyVersion: "x", decidedAt: GATE_CTX.now, checks: {},
      decidedBy: "policy-gate" },
    lineage: { observationIds: [], detector: "phone-detector@1" },
    surfaces: [], version: 1,
  }, { objectId: "business-B", visibility: "public", existenceSensitivity: "low" });
  bPhone.objectId = "business-B";
  const all = [...regA, bPhone];
  const rows = byId(resolveForPrincipal(all,
    { principal: VISITOR, contextObjectId: OBJECT_ID, registry: new Map() }));
  assert.equal(rows["cap_b_phone"].decision, "invisible");
  assert.equal(rows["cap_b_phone"].rule, "capability.object-binding",
    "relationship traversal yields at most a 'reference' affordance, never B's capabilities");
});

test("RED-5 TOCTOU: executeGuard re-checks at use time; withdrawn or changed records are refused", () => {
  const reg = fullRegistry();
  const phone = reg[0];
  const live = new Map(reg.map((r) => [r.capabilityId, r]));
  assert.ok(executeGuard(phone, live).ok, "use while resolved: allowed");
  // Observation withdrawn between resolution and use.
  const withdrawn = { ...phone, status: "withdrawn",
    withdrawal: { cause: "observation_absent", at: GATE_CTX.now } };
  const live2 = new Map(live); live2.set(phone.capabilityId, withdrawn);
  const refused = executeGuard(phone, live2);
  assert.ok(!refused.ok);
  assert.equal(refused.rule, "execution.recheck-status");
  assert.ok(refused.reason.includes("re-resolution required"));
  // Parameters changed between resolution and use.
  const changed = { ...phone, parameters: { ...phone.parameters, actionUri: "tel:+19005550199" } };
  const live3 = new Map(live); live3.set(phone.capabilityId, changed);
  const refused2 = executeGuard(phone, live3);
  assert.ok(!refused2.ok);
  assert.equal(refused2.rule, "execution.recheck-params");
});

test("RED-6 enumeration: cross-tenant kind queries are refused; scoped queries return only granted records", () => {
  const reg = fullRegistry();
  const other = finalizeRecord({
    capabilityId: "cap_other_booking", tenantId: "other-tenant", kind: "booking.schedule",
    channel: "provider", status: "resolved",
    parameters: { displayValue: "Book online", bookingUrl: "https://calendly.com/other/x" },
    evidence: [], policy: { policyVersion: "x", decidedAt: GATE_CTX.now, checks: {},
      decidedBy: "policy-gate" },
    lineage: { observationIds: [], detector: "booking-detector@1" },
    surfaces: [], version: 1,
  }, { objectId: "business-B", visibility: "public", existenceSensitivity: "low" });
  other.objectId = "business-B";
  const registry = new Map([...reg, other].map((r) => [r.capabilityId, r]));
  const harvest = queryCapabilities(registry, { kind: "booking.schedule" }, VISITOR);
  assert.ok(!harvest.ok, "cross-tenant enumeration is BI harvesting");
  assert.equal(harvest.rule, "enumeration.cross-tenant-denied");
  const scoped = queryCapabilities(registry, { tenantId: TENANT }, VISITOR);
  assert.ok(scoped.ok);
  const rows = resolveForPrincipal(scoped.records,
    { principal: VISITOR, contextObjectId: OBJECT_ID, registry });
  assert.ok(rows.every((r) => r.decision !== "granted" ||
    r.record.tenantId === TENANT), "enumeration only ever returns granted records");
  assert.ok(!rows.some((r) => r.decision === "granted" &&
    r.record.capabilityId === "cap_other_booking"));
});

// ---------------------------------------------------------------------------
// 5. Lane-T status projection
// ---------------------------------------------------------------------------
test("PROOF-7 status projection for lane T: resolved->active, stale after threshold, withdrawn->vanished", () => {
  const reg = fullRegistry();
  const phone = reg[0];
  const now = Date.parse(phone.lastChecked) + 1000;
  assert.equal(projectStatus(phone, now), "active");
  assert.equal(projectStatus(phone, Date.parse(phone.lastChecked) + 31 * 24 * 3600 * 1000), "stale");
  assert.equal(projectStatus({ ...phone, status: "withdrawn" }, now), "vanished");
});
