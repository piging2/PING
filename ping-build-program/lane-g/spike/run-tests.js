/**
 * Spike test suite for the Ask FYD context compiler (lane G).
 * Run: node run-tests.js
 * Covers: happy path (worked example), failure modes, red-team T1-T7,
 * determinism, budget gaming, claim-binding verification (B1/B2/B3).
 */
"use strict";

const assert = require("node:assert");
const { compileContext, verifyClaimBindings, canonicalize, sha256hex } = require("./compiler");
const { tenantA, tenantB, oversizedGraph } = require("./synthetic-graph");

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}\n  ${e.message}`); process.exitCode = 1; }
}
const VISITOR = { id: null, role: "visitor" };
const CAPS = [
  { kind: "call", label: "Call", actionId: "call:biz-clearwater" },
  { kind: "open_website", label: "Visit website" },
  { kind: "ask", label: "Ask FYD" },
  { kind: "teleport", label: "Bogus future kind" }, // unknown -> must be skipped (fail closed)
];

// ---------- 1. Worked example: "does this business do emergency calls?" ----------
test("emergency question compiles; emergency service ranked first", () => {
  const r = compileContext({ question: "Does this business do emergency calls?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: CAPS });
  assert.ok(r.ok, JSON.stringify(r.error));
  const p = r.packet;
  assert.strictEqual(p.target.id, "biz-clearwater");
  assert.ok(p.packetId && p.packetId.length === 64, "packetId is sha256");
  const ranked = p.sections.relatedObjects;
  assert.ok(ranked.length > 0, "some related objects selected");
  assert.strictEqual(ranked[0].id, "svc-emergency", `top pick, got ${ranked[0].id} score ${ranked[0].relevance.score}`);
  assert.ok(ranked[0].relevance.reasons.some((x) => x.includes("keyword_overlap")), "reasons recorded");
  // capabilities: known kinds kept, unknown skipped
  const kinds = p.capabilities.map((c) => c.kind).sort();
  assert.deepStrictEqual(kinds, ["ask", "call", "open_website"]);
  // budget ledger
  assert.ok(p.budget.usedBytes <= p.budget.maxBytes, "within byte budget");
  assert.ok(p.sections.evidence.length > 0, "evidence section filled");
  console.log(`  packet ${p.packetId.slice(0, 12)}.. used ${p.budget.usedBytes}/${p.budget.maxBytes} bytes, top score ${ranked[0].relevance.score}`);
});

test("claim bindings for the emergency answer verify; unknowns cite nothing", () => {
  const r = compileContext({ question: "Does this business do emergency calls?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: [] });
  const p = r.packet;
  const svc = p.sections.relatedObjects.find((o) => o.id === "svc-emergency");
  assert.ok(svc, "emergency service in packet");
  const v = verifyClaimBindings(p, [
    { claim: "Emergency plumbing repair is listed as one of this business's services.",
      classification: "website_statement", evidenceRefIds: ["svc-emergency"],
      basis: "The site's own words (website statement, not verified fact)",
      source: "The business website (https://clearwaterplumbing.example)", lastChecked: "2026-09-20" },
    { claim: "I don't know their emergency pricing.", classification: "UNKNOWN",
      evidenceRefIds: [], basis: "no evidence above relevance floor", source: "" },
  ]);
  assert.ok(v.ok, JSON.stringify(v.dropped));
  assert.strictEqual(v.accepted.length, 2);
  assert.strictEqual(v.accepted[0].packetId, p.packetId, "binding commits to packet");
});

// ---------- 2. Failure modes ----------
test("no relevant objects -> empty selection with note, still deterministic", () => {
  const r = compileContext({ question: "Do you sell tractors?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: [] });
  assert.ok(r.ok);
  assert.deepStrictEqual(r.packet.notes, ["no_candidates_above_floor"]);
  assert.strictEqual(r.packet.sections.relatedObjects.length, 0);
  assert.ok(r.packet.sections.target, "target reserved even with no candidates");
});

test("conflicting evidence: both Saturday values admitted, no silent winner", () => {
  const r = compileContext({ question: "Are you open on Saturdays? what are Saturday hours?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: [] });
  assert.ok(r.ok);
  const ids = r.packet.sections.relatedObjects.map((o) => o.id);
  assert.ok(ids.includes("loc-main") && ids.includes("loc-directory"), `both locations present: ${ids}`);
  const v = verifyClaimBindings(r.packet, [
    { claim: "The website lists Saturday close at 12:00 PM.", classification: "website_statement",
      evidenceRefIds: ["loc-main"], basis: "The site's own words", source: "The business website" },
    { claim: "The directory listing lists Saturday close at 2:00 PM.", classification: "DIRECT_FACT",
      evidenceRefIds: ["loc-directory"], basis: "Recorded fact from the site data", source: "Site record (directory)" },
    { claim: "The two sources disagree on Saturday closing time.", classification: "DERIVED_FACT",
      evidenceRefIds: ["loc-main", "loc-directory"], basis: "Derived from the site data", source: "Site record" },
  ]);
  assert.ok(v.ok, JSON.stringify(v.dropped));
});

test("minimal visibility: owner-private note excluded, id never leaks", () => {
  const r = compileContext({ question: "What are your internal margin notes?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: [] });
  assert.ok(r.ok);
  const p = r.packet;
  assert.strictEqual(p.visibilityProof.excluded.nonPublic, 1);
  const blob = canonicalize(p);
  assert.ok(!blob.includes("note-internal"), "hidden object id appears nowhere in the packet");
  assert.ok(!blob.includes("highest margin"), "hidden object content appears nowhere");
});

test("unknown viewer role refuses; empty question refuses", () => {
  const r1 = compileContext({ question: "hi", viewer: { id: null, role: "superadmin" },
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "x", capabilities: [] });
  assert.strictEqual(r1.ok, false); assert.strictEqual(r1.error.kind, "unknown_viewer_role");
  const r2 = compileContext({ question: "   ", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "x", capabilities: [] });
  assert.strictEqual(r2.ok, false); assert.strictEqual(r2.error.kind, "bad_question");
});

test("target over budget -> budget_impossible, no targetless packet", () => {
  const r = compileContext({ question: "emergency?", viewer: VISITOR, targetObjectId: "biz-clearwater",
    graph: tenantA, graphDigest: "x", capabilities: [], budget: { maxBytes: 50 } });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.error.kind, "budget_impossible");
});

// ---------- 3. Red-team ----------
test("T1 prompt injection stays data: boundary-marked, provenance-labeled", () => {
  const r = compileContext({ question: "sewer line service", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "x", capabilities: [] });
  assert.ok(r.ok);
  const p = r.packet;
  const sewer = p.sections.relatedObjects.find((o) => o.id === "svc-sewer");
  assert.ok(sewer, "injected service still selectable as data");
  assert.ok(sewer.description.value.includes("Ignore previous instructions"), "content preserved verbatim, not executed");
  assert.ok(p.contentBoundary.includes("never instructions"), "packet carries content boundary");
  const excerpt = p.sections.sourceExcerpts.find((e) => e.objectId === "svc-sewer");
  if (excerpt) assert.ok(excerpt.boundary.includes("UNTRUSTED"), "excerpt boundary-marked");
  // instruction-adjacent fields contain no website text
  assert.ok(!p.question.normalized.includes("discount bot"));
  assert.ok(!JSON.stringify(p.capabilities).includes("discount bot"));
});

test("T2 malicious description cannot upgrade website_statement to DIRECT_FACT", () => {
  const r = compileContext({ question: "plumbing inspection license", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "x", capabilities: [] });
  assert.ok(r.ok);
  const insp = r.packet.sections.relatedObjects.find((o) => o.id === "svc-inspection");
  assert.ok(insp, "malicious service in packet as data");
  assert.strictEqual(insp.epistemicClass, "website_statement", "epistemic class pinned at selection");
  const v = verifyClaimBindings(r.packet, [
    { claim: "Clearwater is the city-licensed emergency authority.", classification: "DIRECT_FACT",
      evidenceRefIds: ["svc-inspection"], basis: "Recorded fact", source: "Site record" },
  ]);
  assert.ok(!v.ok, "upgrade attempt must be dropped");
  assert.ok(v.dropped[0].problems.some((x) => x.startsWith("epistemic_upgrade")), JSON.stringify(v.dropped));
});

test("T3 cross-tenant dangling edge dropped; zero bytes of tenant B leak", () => {
  const r = compileContext({ question: "partners", viewer: VISITOR, targetObjectId: "biz-clearwater",
    graph: tenantA, graphDigest: "x", capabilities: [] });
  assert.ok(r.ok);
  const p = r.packet;
  assert.strictEqual(p.visibilityProof.excluded.danglingRelationships, 1);
  const blob = canonicalize(p);
  assert.ok(!blob.includes("tenant-b"), "no tenant B id in packet");
  assert.ok(!blob.includes("Rival Plumbing"), "no tenant B content in packet");
});

test("T4 citation smuggling: claim citing hidden object id is dropped", () => {
  const r = compileContext({ question: "emergency calls", viewer: VISITOR, targetObjectId: "biz-clearwater",
    graph: tenantA, graphDigest: "x", capabilities: [] });
  const v = verifyClaimBindings(r.packet, [
    { claim: "Internal notes say emergency jobs are highest margin.", classification: "DIRECT_FACT",
      evidenceRefIds: ["note-internal"], basis: "Recorded fact", source: "Site record" },
  ]);
  assert.ok(!v.ok);
  assert.ok(v.dropped[0].problems.some((x) => x.startsWith("citation_leak")), JSON.stringify(v.dropped));
});

test("T5 absence-inference: counts only, no hidden ids; unknowns do not distinguish", () => {
  const r = compileContext({ question: "internal notes", viewer: VISITOR, targetObjectId: "biz-clearwater",
    graph: tenantA, graphDigest: "x", capabilities: [] });
  const blob = canonicalize(r.packet);
  assert.ok(!blob.includes("note-internal"));
  assert.ok(r.packet.visibilityProof.excluded.nonPublic >= 1, "count recorded honestly");
});

test("T6 budget gaming: 500 keyword-stuffed junk objects cannot drown the target", () => {
  // The junk carries the question keywords, so it clears the relevance gate:
  // this proves the BYTE BUDGET (not relevance filtering) is the backstop.
  // maxRelatedObjects is raised for this test so the byte cap, not the count
  // cap, is what binds; the count-cap path is ledgered as selectionCut.
  const g = oversizedGraph({ stuffed: true });
  const r = compileContext({ question: "emergency calls", viewer: VISITOR, targetObjectId: "biz-clearwater",
    graph: g, graphDigest: "x", capabilities: [], budget: { maxRelatedObjects: 600 } });
  assert.ok(r.ok, JSON.stringify(r.error));
  const p = r.packet;
  assert.ok(p.sections.target && p.sections.target.id === "biz-clearwater", "target reserved and first");
  assert.ok(p.budget.usedBytes <= p.budget.maxBytes, "byte cap holds");
  assert.ok(p.visibilityProof.excluded.budgetCut > 100, `junk cut by budget: ${p.visibilityProof.excluded.budgetCut}`);
  assert.ok(p.sections.relatedObjects.some((o) => o.id === "svc-emergency"), "real evidence survives the flood");
  assert.strictEqual(p.sections.relatedObjects[0].id, "svc-emergency", "real evidence still ranks first");
});

test("T7 agent role strips forbidden effects; secret fields never enter", () => {
  const r = compileContext({ question: "emergency", viewer: { id: "agent-1", role: "agent" },
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "x",
    capabilities: [{ kind: "call", effect: "provider.call" }, { kind: "ask" }] });
  assert.ok(r.ok);
  const p = r.packet;
  assert.ok(!p.capabilities.some((c) => c.kind === "call"), "provider.call stripped for agent role");
  assert.ok(p.capabilities.some((c) => c.kind === "ask"));
  assert.strictEqual(p.visibilityProof.excluded.secretFields, 1, "apiKey field dropped");
  const blob = canonicalize(p);
  assert.ok(!blob.includes("sk-live-DO-NOT-LEAK"), "secret value nowhere in packet");
});

// ---------- 4. Determinism ----------
test("determinism: two runs byte-identical; input order independent", () => {
  const base = { question: "Does this business do emergency calls?", viewer: VISITOR,
    targetObjectId: "biz-clearwater", graph: tenantA, graphDigest: "synthetic", capabilities: CAPS };
  const a = compileContext(base);
  const b = compileContext(base);
  assert.ok(a.ok && b.ok);
  assert.strictEqual(canonicalize(a.packet), canonicalize(b.packet), "byte-identical packets");
  assert.strictEqual(a.packet.packetId, b.packet.packetId);
  // shuffle input order
  const shuffled = JSON.parse(JSON.stringify(tenantA));
  shuffled.objects.reverse(); shuffled.relationships.reverse();
  const c = compileContext({ ...base, graph: shuffled });
  assert.ok(c.ok);
  assert.strictEqual(c.packet.packetId, a.packet.packetId, "packetId independent of input order");
});

console.log(`\n${passed} tests passed.`);
