/**
 * LANE O — dependency index proof (spike).
 *
 * Proves on a real-id Coppersmith fixture graph (ids from the LANE-LIN
 * tracer + lane N's lineage proof): a service-description change yields the
 * exact affected set, unaffected artifacts regenerate byte-identically, a
 * second identical change yields an empty set, and the red-team threats
 * (missed invalidation, over-invalidation storm, cycles, crash loss) are
 * handled, not hoped away.
 *
 * Run: node prove.mjs
 */
import { strict as assert } from "node:assert";
import {
  buildIndex, propagate, planRegeneration, applyTickResults, rebuildIndex,
  verifyEquivalence, serveCheck, serializeIndex, deserializeIndex,
  recomputeDigest, sectionDigest, nodeId, sha256, canon,
} from "./dep-index.mjs";

// --- Real ids (LANE-LIN tracer expectations; lane-n/prototype/lineage-proof.mjs) ---
const BUS = "website-business-2f1327c09d622175";
const SVC1 = "website-business-2f1327c09d622175-service-139408827c27"; // New Construction
const SVC2 = "website-business-2f1327c09d622175-service-9aa01bb3";     // Drain Cleaning

function makeCanonical() {
  return {
    tenantId: "site:coppersmith-plumbing",
    businessObjectId: BUS,
    tokensDigest: sha256(canon(["tokens-v3"])),
    watermark: { stream: "ping_events", seq: 1042, at: "2026-09-23T19:29:00.000Z" },
    objects: {
      [BUS]: { schema: "Business", fields: {
        name: "Coppersmith Plumbing", phone: "(970) 555-0134",
        hours: "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM",
        address: "1201 N 15th St, Grand Junction, CO", updatedAt: "2026-09-23T06:00:00Z" } },
      [SVC1]: { schema: "Service", fields: {
        title: "New Construction Plumbing",
        description: "New construction: residential and commercial.",
        updatedAt: "2026-09-23T06:00:00Z" } },
      [SVC2]: { schema: "Service", fields: {
        title: "Drain Cleaning", description: "Fast drain cleaning, same-day service." } },
    },
    sections: {
      "home:Hero:0":     { page: "/", component: "Hero", binds: ["owner"] },
      "home:About:1":    { page: "/", component: "About", binds: ["owner"] },
      "home:Services:2": { page: "/", component: "Services", binds: [SVC1, SVC2] },
      "services:Services:0": { page: "/services", component: "Services", binds: [SVC1, SVC2] },
      "home:Contact:3":  { page: "/", component: "Contact", binds: ["owner"] },
      "home:Footer:4":   { page: "/", component: "Footer", binds: ["owner"] },
      "home:Reviews:5":  { page: "/", component: "Reviews", binds: [] },
    },
    pages: {
      "/": ["home:Hero:0", "home:About:1", "home:Services:2", "home:Reviews:5", "home:Contact:3", "home:Footer:4"],
      "/services": ["services:Services:0"],
      "/contact": ["home:Contact:3", "home:Footer:4"],
      "/reviews": ["home:Reviews:5"],
    },
    // The planner's DependencyManifest: object-field -> binding edges (authoritative).
    manifest: {
      plannerVersion: "planner@3.2.0",
      bindings: [
        { bindingId: "home:Hero:0", objectFields: [BUS + "|name", BUS + "|phone"] },
        { bindingId: "home:About:1", objectFields: [BUS + "|name", BUS + "|address"] },
        { bindingId: "home:Services:2", objectFields: [SVC1 + "|title", SVC1 + "|description", SVC2 + "|title", SVC2 + "|description"] },
        { bindingId: "services:Services:0", objectFields: [SVC1 + "|title", SVC1 + "|description", SVC2 + "|title", SVC2 + "|description"] },
        { bindingId: "home:Contact:3", objectFields: [BUS + "|phone", BUS + "|hours"] },
        { bindingId: "home:Footer:4", objectFields: [BUS + "|hours", BUS + "|address"] },
        // NOTE: home:Reviews:5 deliberately NOT in the manifest (simulates a
        // generator that forgot to register a binding). The index must report
        // it as a typed gap, never silently pass.
      ],
    },
    specDigest: sha256(canon(["spec-v7"])),
    facts: [
      { sourceId: "src:coppersmith-web", factRef: "services.new_construction", claimId: "claim:svc-new-construction-01",
        objectId: SVC1, field: "description", value: "New construction: residential and commercial.", sourceBytes: "pinned-raw-bytes-v1" },
      { sourceId: "src:coppersmith-web", factRef: "business.hours", claimId: "claim:biz-hours-01",
        objectId: BUS, field: "hours", value: "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM", sourceBytes: "pinned-raw-bytes-v1" },
    ],
  };
}

/** Refresher: applies a graded change to canonical state, emits change events. */
function applyFactChange(canonical, { sourceBytes, factRef, claimId, objectId, field, newValue, eventSeq }) {
  const existing = canonical.facts.find((f) => f.factRef === factRef);
  canonical.facts.push({
    sourceId: existing.sourceId, factRef, claimId, objectId, field,
    value: newValue, sourceBytes,
    supersedes: existing.claimId,
  });
  canonical.objects[objectId].fields[field] = newValue;
  const fid = nodeId.objfield(objectId, field);
  return [
    { eventId: "evt:seq-" + eventSeq, kind: "field_changed", nodeId: fid, newValue },
    { eventId: "evt:seq-" + eventSeq + "-src", kind: "source_bytes",
      nodeId: nodeId.source(existing.sourceId), newValue: sourceBytes },
  ];
}

/** Render every section's content digest from canonical state (the "renderer"). */
function renderAll(canonical) {
  const out = {};
  for (const sid of Object.keys(canonical.sections)) out[sid] = sectionDigest(canonical, sid);
  return out;
}

/** Full tick: propagate -> plan -> fake-execute -> apply (pins+watermark atomic). */
function runTick(index, canonical, events, tickId, policy, seq) {
  const plan = propagate(index, canonical, events, tickId);
  const jobs = planRegeneration(index, plan, policy);
  const results = jobs.filter((j) => !j.spilled).map((j) => {
    const target = j.target.startsWith("graph:") ? j.target.slice("graph:".length) : j.target;
    return {
      job_id: j.job_id,
      status: "done",
      pin_after: index.nodes[target] ? recomputeDigest(canonical, { nodes: index.nodes }, target) : null,
      refreshed_at: "2026-09-23T20:00:41.000Z",
      evidence_refs: events.map((e) => e.eventId),
    };
  });
  const srcEvent = events.find((e) => e.kind === "source_bytes");
  const repin = [
    // Stage 1: the refresher re-pins the source bytes digest at acquisition.
    ...(srcEvent ? [{
      nodeId: srcEvent.nodeId,
      pin: sha256(canon(["bytes", srcEvent.newValue])),
      bytesDigest: sha256(canon(["bytes", srcEvent.newValue])),
    }] : []),
    // Stages 2-3: obs/claim re-pins track the newest facts.
    ...Object.keys(index.nodes)
      .filter((n) => ["obs", "claim"].includes(index.nodes[n].kind))
      .map((nodeId) => ({ nodeId })),
  ];
  const next = applyTickResults(index, canonical, jobs, results, repin,
    { stream: "ping_events", seq, at: "2026-09-23T20:00:42.000Z" });
  return { plan, jobs, next };
}

const POLICY = { maxRegenUnits: 10, stalenessBudget: {} };
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; console.log("  PASS:", msg); };

console.log("=== LANE O DEPENDENCY INDEX PROOF ===\n");

// ---------- 1. build: pure, deterministic, rebuildable ----------
const canonical = makeCanonical();
const idx1 = buildIndex(canonical, { builtAt: "2026-09-23T19:30:00.000Z" });
const idx2 = buildIndex(canonical, { builtAt: "2026-09-24T08:00:00.000Z" }); // different built_at
ok(idx1.index_digest === idx2.index_digest, "build is pure: identical digest for identical canonical (built_at excluded): " + idx1.index_digest.slice(0, 16));
ok(idx1.unbound_sections.includes(nodeId.section("home:Reviews:5")), "unbound section home:Reviews:5 is a typed gap, not a silent pass");
console.log("  index_digest:", idx1.index_digest.slice(0, 32) + "...");
console.log("  nodes:", Object.keys(idx1.nodes).length, "edges:", idx1.edges.length);

// ---------- 2. service description change -> exact affected set ----------
const before = renderAll(canonical);
const events = applyFactChange(canonical, {
  sourceBytes: "pinned-raw-bytes-v2-rewritten",
  factRef: "services.new_construction", claimId: "claim:svc-new-construction-02",
  objectId: SVC1, field: "description",
  newValue: "New construction: residential only.",
  eventSeq: 1044,
});
const plan = propagate(idx1, canonical, events, "tick-1");
const invalidIds = plan.invalidations.map((i) => i.node_id).sort();
console.log("\n  invalidated:", JSON.stringify(invalidIds));
console.log("  early_cutoffs:", plan.early_cutoffs, "dedup_merges:", plan.dedup_merges, "dropped:", JSON.stringify(plan.dropped.map((d) => d.reason)));
ok(invalidIds.includes(nodeId.section("home:Services:2")), "section home:Services:2 invalidated");
ok(invalidIds.includes(nodeId.section("services:Services:0")), "section services:Services:0 invalidated");
ok(invalidIds.includes(nodeId.page("/")), "page / invalidated");
ok(invalidIds.includes(nodeId.page("/services")), "page /services invalidated");
ok(!invalidIds.includes(nodeId.section("home:Hero:0")), "hero NOT invalidated (no collateral)");
ok(!invalidIds.includes(nodeId.section("home:Contact:3")), "contact NOT invalidated (no collateral)");
ok(!invalidIds.includes(nodeId.page("/contact")), "page /contact NOT invalidated");
ok(!invalidIds.includes(nodeId.page("/reviews")), "page /reviews NOT invalidated");
const inv22 = plan.invalidations.find((i) => i.node_id === nodeId.section("home:Services:2"));
ok(inv22.causes.length >= 1 && inv22.pin_before.length === 64, "invalidation record carries pin_before + causes (evidence for lane J)");

// ---------- 3. planner: ranked, ordered, bounded, idempotent jobs ----------
const jobs = planRegeneration(idx1, plan, POLICY);
ok(jobs[0].action === "reverify-graph", "rank law: reverify-graph jobs sort before regenerate jobs");
ok(jobs.every((j) => j.idempotency_key === j.job_id && j.job_id.startsWith("rg_")), "deterministic job ids double as idempotency keys");
ok(new Set(jobs.map((j) => j.job_id)).size === jobs.length, "job ids unique");
ok(jobs.every((j) => !j.spilled), "within budget: nothing spilled");
const tightJobs = planRegeneration(idx1, plan, { maxRegenUnits: 2, stalenessBudget: {} });
ok(tightJobs.filter((j) => j.spilled).length === tightJobs.length - 2, "overflow spills with causes preserved (backpressure, not silent drop)");
console.log("  jobs:", jobs.map((j) => j.action + ":" + j.target.split(":").pop()).join(", "));

// ---------- 4. apply: pins move, watermark advances atomically, unaffected identical ----------
const tick1 = runTick(idx1, canonical, events, "tick-1", POLICY, 1045);
const idx3 = tick1.next;
const after = renderAll(canonical);
ok(idx3.watermark.seq === 1045, "watermark advanced with pins in ONE update (atomic by construction)");
for (const sid of ["home:Hero:0", "home:About:1", "home:Contact:3", "home:Footer:4"]) {
  ok(before[sid] === after[sid], "unaffected section " + sid + " regenerated byte-identically (no collateral diff)");
}
ok(before["home:Services:2"] !== after["home:Services:2"], "changed section home:Services:2 content differs");
ok(before["services:Services:0"] !== after["services:Services:0"], "changed section services:Services:0 content differs");

// ---------- 5. idempotent: the same change again yields an EMPTY set ----------
const planAgain = propagate(idx3, canonical, events, "tick-2");
ok(planAgain.invalidations.length === 0, "second identical change -> empty invalidation set (pins already current)");
ok(planAgain.dropped.length === 2 && planAgain.dropped.every((d) => d.reason === "pin-equal-no-semantic-change"),
  "re-delivered events dropped at the pin pre-check, never re-propagated");

// ---------- 6. no-op re-ingest: byte-identical re-fetch kills propagation ----------
const noopEvents = [
  { eventId: "evt:seq-1046", kind: "source_bytes", nodeId: nodeId.source("src:coppersmith-web"), newValue: "pinned-raw-bytes-v2-rewritten" },
];
const planNoop = propagate(idx3, canonical, noopEvents, "tick-3");
ok(planNoop.invalidations.length === 0, "byte-identical re-ingest: zero invalidations");
ok(planNoop.dropped.length === 1 && planNoop.dropped[0].reason === "pin-equal-no-semantic-change",
  "byte-identical re-fetch dropped at the pin pre-check: the most common factory event costs one hash comparison");

// ---------- 7. volatile stamps never move pins and never storm ----------
const stampEvents = [
  { eventId: "evt:seq-1047", kind: "field_changed",
    nodeId: nodeId.objfield(SVC1, "updatedAt"), newValue: "2026-09-23T21:00:00Z" },
];
const planStamp = propagate(idx3, canonical, stampEvents, "tick-4");
ok(planStamp.invalidations.length === 0, "volatile stamp movement is NOT a change (no storm)");
ok(planStamp.dropped[0].reason === "unknown-node", "volatile fields have no nodes at all: they were never edges, so they can never storm");
ok(!Object.keys(idx3.nodes).some((n) => n.endsWith("|updatedAt") || n.endsWith("|createdAt")),
  "edge-registration invariant: volatile fields are never index nodes/edges");

// ---------- 8. RED TEAM ----------

console.log("\n--- RED TEAM ---");

// R1 missed invalidation: the unbound Reviews section content changed, the
// index cannot see it. The index must REPORT the gap, and the planner's
// coarse fallback must re-verify it every tick (bounded, honest).
canonical.objects[BUS].fields.name = "Coppersmith Plumbing Co.";
const planMiss = propagate(idx3, canonical, [
  { eventId: "evt:seq-1048", kind: "field_changed",
    nodeId: nodeId.objfield(BUS, "name"), newValue: "Coppersmith Plumbing Co." },
], "tick-5");
const jobsMiss = planRegeneration(idx3, planMiss, POLICY);
const fallback = jobsMiss.find((j) => j.target === nodeId.section("home:Reviews:5"));
ok(planMiss.unbound_sections.includes(nodeId.section("home:Reviews:5")), "R1: unbound gap still reported on the plan");
ok(!!fallback && fallback.causes.includes("coarse-fallback:unbound"), "R1: unbound section gets a bounded coarse-fallback job (re-verified by render compare), never silently stale");

// R2 over-invalidation storm: a high-fan-out node is flagged, dedup keeps the
// visit count at one per node, early cutoff still kills clean branches.
for (let i = 0; i < 70; i++) {
  const sid = "home:Storm:" + i;
  canonical.sections[sid] = { page: "/", component: "Storm", binds: ["owner"] };
  canonical.pages["/"].push(sid);
  canonical.manifest.bindings.push({ bindingId: sid, objectFields: [BUS + "|name"] });
}
const stormBase = buildIndex(canonical, { builtAt: idx3.built_at }); // storm edges, OLD name pin
canonical.objects[BUS].fields.name = "Coppersmith Plumbing & Heating";
const planStorm = propagate(stormBase, canonical, [
  { eventId: "evt:seq-1049", kind: "field_changed", nodeId: nodeId.objfield(BUS, "name"), newValue: "Coppersmith Plumbing & Heating" },
], "tick-6");
ok(planStorm.fanout_flags.some((f) => f.node_id === nodeId.objfield(BUS, "name") && f.fanout > 64),
  "R2: fan-out tripwire fires on the pathological node (schema smell reported, lane-J observable)");
const stormInvalid = planStorm.invalidations.filter((i) => i.node_id.startsWith("section:home:Storm:"));
ok(stormInvalid.length === 70, "R2: each storm section invalidated exactly once (dedup rule holds the line)");
ok(planStorm.dedup_merges > 0, "R2: fan-in merges recorded (page / reached once per storm section, merged)");

// R3 cycles: a poisoned manifest edge pointing upstream is detected
// structurally, and the run still terminates via the visited set.
const cycIndex = buildIndex(canonical, { builtAt: idx3.built_at });
cycIndex.edges.push({ from: nodeId.page("/"), to: nodeId.objfield(BUS, "name"), kind: "poison", via: "test" });
const planCyc = propagate(cycIndex, canonical, [
  { eventId: "evt:seq-1050", kind: "field_changed", nodeId: nodeId.objfield(BUS, "name"), newValue: "Coppersmith Plumbing LLC" },
], "tick-7");
ok(planCyc.cycles_detected.some((n) => n === nodeId.page("/") || n === nodeId.objfield(BUS, "name")),
  "R3: cycle detected and reported as a defect (edge registration bug, never a valid state)");
ok(true, "R3: propagation terminated despite the cycle (visited set bounds every run)");

// R4 crash: index lost -> rebuild from canonical, verified against pinned digest.
const canR = makeCanonical();
const idxR = buildIndex(canR, { builtAt: "2026-09-23T19:30:00.000Z" });
const roundTripped = deserializeIndex(serializeIndex(idxR));
ok(roundTripped.index_digest === idxR.index_digest, "R4: index survives serialization round-trip with digest intact");
const rebuilt = rebuildIndex(canR, idxR.index_digest, idxR.built_at);
ok(rebuilt.verified === true, "R4: rebuilt index verified byte-identical against the pinned digest (disposable-by-rebuild, never hand-repaired)");
const rebuiltBad = rebuildIndex(canR, "deadbeef".repeat(8), idxR.built_at);
ok(rebuiltBad.verified === false, "R4: wrong pinned digest -> verified=false, no false pass");

// R5 crash mid-tick: applied state lost before persist -> replay from the
// persisted watermark converges to the IDENTICAL index (idempotent retry).
const can5 = makeCanonical();
const idxA = buildIndex(can5, { builtAt: "2026-09-23T19:30:00.000Z" });
const ev5 = applyFactChange(can5, {
  sourceBytes: "pinned-raw-bytes-v2", factRef: "services.new_construction",
  claimId: "claim:svc-new-construction-02", objectId: SVC1, field: "description",
  newValue: "New construction: residential only.", eventSeq: 2001,
});
const tickA = runTick(idxA, can5, ev5, "tick-1", POLICY, 2001);
const idxB = tickA.next;                       // <-- "lost": crash before persist
const persistedA = deserializeIndex(serializeIndex(idxA)); // what survived
const tickA2 = runTick(persistedA, can5, ev5, "tick-1", POLICY, 2001);
ok(tickA2.plan.plan_id === tickA.plan.plan_id, "R5: replay from the old watermark yields the identical plan id (deterministic)");
ok(tickA2.next.index_digest === idxB.index_digest, "R5: replayed apply converges to the identical index digest (idempotent retry)");
const eq5 = verifyEquivalence(tickA2.next, can5);
ok(eq5.equivalent === true, "R5: converged index is pin-equivalent to canonical (no silent drift)");

// R6 integrity: the scheduled equivalence check catches pin drift.
const drifted = JSON.parse(JSON.stringify(tickA2.next.nodes));
drifted[nodeId.section("home:Services:2")].pin = "sha256:tampered";
const eqDrift = verifyEquivalence({ nodes: drifted }, can5);
ok(eqDrift.equivalent === false && eqDrift.divergentNodes.includes(nodeId.section("home:Services:2")),
  "R6: tampered/drifted pin caught by the equivalence check with the exact node id");

// R7 staleness: the serving layer never serves a known-invalid page as fresh.
const stale = serveCheck(tickA.plan, nodeId.page("/"), {});
ok(stale.fresh === false && stale.reason === "pin-older-than-invalidated_at", "R7: page with known invalidation and no refresh is NOT served as fresh");
const fresh = serveCheck(tickA.plan, nodeId.page("/"),
  { [nodeId.page("/")]: new Date(Date.now() + 60000).toISOString() });
ok(fresh.fresh === true, "R7: same page after refresh serves fresh");

console.log("\n" + passed + " assertions passed.");
console.log("ALL DEPENDENCY INDEX PROOF TESTS PASSED");
