// Delta tests for extend/context-compiler.ts.
// Each test pins one gap closure (G1..G12) or one adopted behavior.
// Run: node extend/test-delta.js
import {
  compileAskContext,
  verifyAnswerClaims,
  resolveViewerScope,
  classificationFromProvenance,
} from "./context-compiler.ts";

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e && e.message ? e.message : String(e) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || "not equal"}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

const VIS = { id: "v1", tier: "visitor", grants: [] };
const OWNER = { id: "owner-1", tier: "owner", grants: ["owner"] };
const AGENT = { id: "a1", tier: "agent", grants: [], delegatedTier: "visitor" };

function biz() {
  return {
    id: "biz",
    schema: "ping.social.business@1",
    title: "Acme Plumbing",
    description: "Emergency plumbing repair in Grand Junction",
    fields: { phone: "(970) 555-0100", hours: "Mon-Fri 8-5" },
    visibility: "public",
    provenance: { kind: "website-ingestion", ref: "https://acme.example", derivedAt: "2026-09-20" },
  };
}
function svc(id, title, desc, provKind = "website-ingestion") {
  return {
    id, schema: "ping.social.service@1", title, description: desc,
    fields: {}, visibility: "public",
    provenance: { kind: provKind, ref: "https://acme.example", derivedAt: "2026-09-21" },
  };
}
function rel(id, s, p, o) {
  return { id, subject: s, predicate: p, object: o, status: "active" };
}
function baseInput(over = {}) {
  return {
    question: "Who do I call for an emergency plumbing repair?",
    viewer: VIS,
    siteId: "site-1",
    graph: {
      objects: [biz(), svc("svc-em", "Emergency Plumbing Repair", "24/7 emergency plumbing repair")],
      relationships: [rel("r1", "biz", "provides", "svc-em")],
    },
    ...over,
  };
}

// T1 adopted: emergency service ranks first for the emergency question.
test("T1 emergency service ranks first (adopted scoring)", () => {
  const p = compileAskContext(baseInput());
  assertEq(p.objects[0].id, "biz", "target business first");
  const ids = p.objects.map((o) => o.id);
  assert(ids.includes("svc-em"), "emergency service selected");
  const svcObj = p.objects.find((o) => o.id === "svc-em");
  assert(svcObj.relevance.why.some((w) => w.startsWith("token-hits")), "token-hit reason present");
});

// T2 G2: exclusion ledger is counts-only; no ids anywhere in it.
test("T2 exclusion ledger counts-only, no id leakage (G2)", () => {
  const hidden = { id: "hid-9", schema: "ping.social.service@1", title: "Secret Service", visibility: "owner-private", provenance: { kind: "owner-authored" } };
  const p = compileAskContext(baseInput({ graph: { objects: [biz(), hidden], relationships: [] } }));
  const ex = p.visibility.excluded;
  assertEq(typeof ex, "object", "excluded is an object");
  assert(Array.isArray(ex) === false, "excluded is not an array");
  assertEq(ex.nonPublic, 1, "one non-public counted");
  const packetText = JSON.stringify({ visibility: p.visibility });
  assert(!packetText.includes("hid-9"), "hidden id appears nowhere in visibility block");
  assert(!p.objects.some((o) => o.id === "hid-9"), "hidden object not in packet");
});

// T3 G3: nonsense question -> relevance gate, honest-UNKNOWN path.
test("T3 relevance gate: nonsense question yields no evidence + note (G3)", () => {
  const p = compileAskContext(baseInput({ question: "Do you sell tractors?" }));
  const nonTarget = p.objects.filter((o) => o.id !== "biz");
  assertEq(nonTarget.length, 0, "no non-target evidence selected");
  assert(p.notes.includes("no_candidates_above_floor"), "honest-UNKNOWN note present");
  assert(p.visibility.excluded.belowFloor > 0, "belowFloor counted");
});

// T4 G4: packetId commits to full body; content change -> new id; same -> same.
test("T4 packetId is full-body: content change changes id (G4)", () => {
  const a = compileAskContext(baseInput());
  const g2 = baseInput();
  g2.graph.objects[1].fields = { note: "different content here" };
  const b = compileAskContext(g2);
  assert(a.packetId !== b.packetId, "same ids but different content must change packetId");
  const c = compileAskContext(baseInput());
  assertEq(a.packetId, c.packetId, "identical inputs -> identical packetId");
  assertEq(a.packetId, a.digests.packet, "digests.packet == packetId");
});

// T5 G5: epistemic rank B3 — website claims cannot become verified facts.
test("T5 epistemic_upgrade rejected (G5/B3)", () => {
  const p = compileAskContext(baseInput());
  const ev = p.evidence.find((e) => e.classification === "website_statement");
  assert(ev, "website_statement evidence exists");
  const bad = verifyAnswerClaims(p, [
    { text: "Open 24/7, verified fact", grade: "SUPPORTED", evidenceRefIds: [ev.evidenceId], epistemic: "DIRECT_FACT" },
  ]);
  assert(!bad.ok, "upgrade must fail");
  assert(bad.violations.some((v) => v.violation === "epistemic_upgrade"), "epistemic_upgrade violation named");
  const fine = verifyAnswerClaims(p, [
    { text: "The website lists emergency repair", grade: "SUPPORTED", evidenceRefIds: [ev.evidenceId] },
  ]);
  assert(fine.ok, "grade-level SUPPORTED without epistemic stays allowed");
});

// T6 G6: provenance mapping extended.
test("T6 directory->DIRECT_FACT, owner-correction->USER_OVERRIDE (G6)", () => {
  assertEq(classificationFromProvenance("directory"), "DIRECT_FACT", "directory");
  assertEq(classificationFromProvenance("owner-correction"), "USER_OVERRIDE", "owner-correction");
  assertEq(classificationFromProvenance("owner-authored"), "USER_OVERRIDE", "owner-authored");
  assertEq(classificationFromProvenance("website-ingestion"), "website_statement", "website-ingestion");
  assertEq(classificationFromProvenance("canonical-journal"), "DIRECT_FACT", "canonical-journal");
});

// T7 G7: secret-shaped fields stripped and counted.
test("T7 secret fields stripped, never enter packet (G7)", () => {
  const g = baseInput();
  g.graph.objects[0].fields.api_key = "sk-live-123";
  const p = compileAskContext(g);
  const b = p.objects.find((o) => o.id === "biz");
  assert(!("api_key" in b.fields), "api_key absent from packet fields");
  assert(!JSON.stringify(p).includes("sk-live-123"), "secret value appears nowhere");
  assertEq(p.visibility.excluded.secretFields, 1, "secretFields counted");
});

// T8 G8: capability gating.
test("T8 capabilities filtered; forbidden agent effects stripped (G8)", () => {
  const caps = [
    "open_website",
    { kind: "call", label: "Call" },
    { kind: "call", label: "Sneaky", effect: "message.send" },
    { kind: "site.publish", label: "Publish", effect: "site.publish" },
    { kind: "mystery", label: "Mystery" },
  ];
  const agentP = compileAskContext(baseInput({ viewer: AGENT, capabilities: caps }));
  const kinds = agentP.capabilities.map((c) => c.kind);
  assert(kinds.includes("open_website") && kinds.includes("call"), "known kinds kept");
  assert(!agentP.capabilities.some((c) => c.label === "Sneaky"), "forbidden effect stripped for agent");
  assert(!kinds.includes("site.publish"), "unknown kind dropped for agent too");
  assert(!kinds.includes("mystery"), "unknown kind dropped");
  const ownerP = compileAskContext(baseInput({ viewer: OWNER, ownerId: "owner-1", capabilities: caps }));
  assert(ownerP.capabilities.some((c) => c.label === "Sneaky"), "owner keeps known kind with effect (owner loop authorizes)");
  assert(!ownerP.capabilities.some((c) => c.kind === "site.publish"), "unknown kind has no consumer; dropped for owner too");
});

// T9 G1: byte budget is the backstop; flood cannot displace target.
test("T9 byte budget backstops a 500-object flood (G1)", () => {
  const objs = [biz()];
  for (let i = 0; i < 500; i++) {
    objs.push(svc(`flood-${i}`, "plumbing repair emergency drain", "plumbing repair emergency drain ".repeat(40)));
  }
  const p = compileAskContext(
    baseInput({ graph: { objects: objs, relationships: [] }, limits: { maxObjects: 600 } }),
  );
  assert(p.budget.usedBytes <= p.budget.maxBytes, `used ${p.budget.usedBytes} <= max ${p.budget.maxBytes}`);
  assert(p.objects.some((o) => o.id === "biz"), "target survives the flood");
  assert(p.visibility.excluded.budgetCut > 0, "budget cuts ledgered");
});

// T10 G11: lane F seam boosts hits and binds the index digest.
test("T10 lane F seam: hit boosts selection, indexDigest bound (G11)", () => {
  const quiet = svc("svc-quiet", "Quiet Service", "something unrelated entirely");
  const p = compileAskContext(
    baseInput({
      graph: { objects: [biz(), quiet], relationships: [] },
      search: { hits: [{ objectId: "svc-quiet", tier: "exact", rule: "exact-id", score: 1 }], indexDigest: "idx-abc" },
    }),
  );
  const q = p.objects.find((o) => o.id === "svc-quiet");
  assert(q, "search hit selected despite no token overlap");
  assert(q.relevance.why.some((w) => w.startsWith("search:")), "search reason recorded");
  assertEq(p.digests.searchIndex, "idx-abc", "indexDigest bound into packet");
});

// T11 G10: predicate weights follow lane E vocabulary.
test("T11 lane E relationship vocabulary weights scoring (G10)", () => {
  const p = compileAskContext(baseInput());
  const s = p.objects.find((o) => o.id === "svc-em");
  assert(s.relevance.why.includes("predicate_w=0.9"), `provides->0.9, got ${s.relevance.why.join(",")}`);
});

// T12 adopted: verifyAnswerClaims base discipline intact.
test("T12 adopted claim discipline: unbound/unknown-grade/smuggled (base)", () => {
  const p = compileAskContext(baseInput());
  const ev = p.evidence[0].evidenceId;
  assert(!verifyAnswerClaims(p, [{ text: "x", grade: "SUPPORTED", evidenceRefIds: [] }]).ok, "unbound_claim");
  assert(!verifyAnswerClaims(p, [{ text: "x", grade: "UNKNOWN", evidenceRefIds: [ev] }]).ok, "unknown_with_citations");
  assert(!verifyAnswerClaims(p, [{ text: "x", grade: "SUPPORTED", evidenceRefIds: ["ev:nope"] }]).ok, "evidence_not_in_packet");
  assert(!verifyAnswerClaims(p, [{ text: "x", grade: "MAYBE", evidenceRefIds: [ev] }]).ok, "unknown_grade");
  assert(verifyAnswerClaims(p, [{ text: "ok", grade: "DERIVED", evidenceRefIds: [ev] }]).ok, "bound DERIVED passes");
});

// T13 adopted: hidden fields + private objects per tier.
test("T13 adopted visibility: hidden fields and private objects per tier", () => {
  const g = baseInput();
  g.graph.objects[0].fields.internal_note = "do not show visitors";
  const fv = { biz: { internal_note: "hidden" } };
  const vp = compileAskContext({ ...g, fieldVisibility: fv });
  assert(!("internal_note" in vp.objects.find((o) => o.id === "biz").fields), "visitor: hidden field absent");
  assertEq(vp.visibility.excluded.ownerHiddenFields, 1, "visitor: hidden field counted");
  const op = compileAskContext({ ...g, viewer: OWNER, ownerId: "owner-1", fieldVisibility: fv });
  const of = op.objects.find((o) => o.id === "biz").fields.internal_note;
  assert(of && typeof of === "object" && of.hiddenInPublic === true, "owner: hidden field flagged");
});

// T14 G9: content boundary present; excerpts boundary-marked.
test("T14 contentBoundary present, excerpts marked untrusted (G9)", () => {
  const p = compileAskContext(baseInput());
  assert(typeof p.contentBoundary === "string" && p.contentBoundary.length > 20, "contentBoundary string");
  assert(p.sourceExcerpts.length > 0, "excerpts present");
  assert(p.sourceExcerpts.every((e) => e.boundary.includes("UNTRUSTED")), "excerpts boundary-marked");
  assert(p.objects.every((o) => o.contentRole === "DATA"), "all objects DATA");
});

// T15 impossible target budget refuses (fail closed).
test("T15 impossible target budget refuses instead of targetless context", () => {
  const g = baseInput();
  g.graph.objects[0].description = "x".repeat(50000);
  let threw = false;
  try {
    compileAskContext({ ...g, budget: { maxBytes: 100 } });
  } catch (e) {
    threw = /impossible target budget/.test(e.message);
  }
  assert(threw, "must throw impossible target budget");
});

// T16 adopted: unknown viewer tier fails closed; agent delegation.
test("T16 adopted: unknown tier downgrades, owner-unverified downgrades", () => {
  const s1 = resolveViewerScope({ id: "x", tier: "superadmin", grants: [] }, null);
  assertEq(s1.tier, "anonymous", "unknown tier -> anonymous");
  const s2 = resolveViewerScope({ id: "impostor", tier: "owner", grants: [] }, "owner-1");
  assertEq(s2.tier, "visitor", "unverified owner -> visitor");
});

// T17 determinism: repeated + order-reversed compilation identical.
test("T17 determinism: repeated and input-order-reversed runs identical", () => {
  const a = compileAskContext(baseInput());
  const b = compileAskContext(baseInput());
  assertEq(a.packetId, b.packetId, "repeated runs identical");
  const rev = baseInput();
  rev.graph.objects = [...rev.graph.objects].reverse();
  const c = compileAskContext(rev);
  assertEq(a.packetId, c.packetId, "input order does not change packet");
});

let pass = 0;
for (const r of results) {
  if (r.ok) { pass++; console.log(`PASS ${r.name}`); }
  else console.log(`FAIL ${r.name}\n     ${r.error}`);
}
console.log(`\n${pass}/${results.length} delta tests passed`);
process.exit(pass === results.length ? 0 : 1);
