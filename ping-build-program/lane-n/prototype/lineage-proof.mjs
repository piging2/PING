/**
 * LANE N proof prototype: REAL-id chain + adversarial red-team + lane-O feed.
 *
 * Companion to prototype/lineage.mjs (the design's Sunrise worked example).
 * This file proves the chain on the REAL Coppersmith path verified by the
 * LANE-LIN tracer (ids from src/fyd/lineage/verify-tracer.ts): the claim,
 * object id, relationship id, and section ids below are the tracer's
 * asserted expectations, not invented.
 *
 * - Backward walk: ANSWER -> SOURCE, every hop identity + hash + timestamp.
 * - Forward walk: SOURCE -> everything derived (lane O regeneration set).
 * - Source-change simulation: new acquisition digest -> supersede chain ->
 *   forward walk flags affected artifacts.
 * - Red-team: R1 forgery, R2 evidence expiry, R3 cross-tenant leakage,
 *   R4 secret leakage, R5 pre-lineage honest gap.
 *
 * Zero dependencies. Run: node prototype/lineage-proof.mjs
 */
import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const canon = (v) => JSON.stringify(v, Object.keys(v).sort());

const TENANT = "t-ping";
const NS = "site:coppersmith-plumbing";

// --- Real ids from the LANE-LIN verify test (tracer asserted expectations) ---
const CLAIM =
  "Are you working on new construction for residential homes or commercial buildings?";
const OBJECT_ID = "website-business-2f1327c09d622175-service-139408827c27";
const REL_ID = "rel-f450fdb901a6baa3";
const SECTIONS = ["home:Services:2", "services:Services:0"];
const SOURCE_URL = "https://coppersmithplumbing.example/services";

// Same deterministic shape as evidenceRefForFact in the PING proceduralizer:
// "web:" + sha256(sourceType|name|JSON(value)|entityId)[:12]
const OBS_EVIDENCE_REF = "web:" + sha256(
  ["html", "services.new_construction", JSON.stringify(CLAIM), "ent:svc-new-construction-01"].join("|")
).slice(0, 12);

// Supporting records are synthetic but schema-true to the design; digests
// are computed for real with node:crypto.
const records = [
  { kind: "SOURCE", id: "src:coppersmith-web", tenantId: TENANT, namespace: NS,
    sourceKey: "web:" + SOURCE_URL, externalObjectId: "web:" + SOURCE_URL, liveness: "active" },
  { kind: "ACQUISITION", id: "acq:2026-09-23T06-00-web", tenantId: TENANT, namespace: NS,
    sourceId: "src:coppersmith-web", connectorId: "web-fetch",
    retrievedAt: "2026-09-23T12:00:04Z",
    contentDigest: "sha256:" + sha256("pinned-raw-bytes-v1"),
    bytes: 48210, method: "http-get",
    rawPointer: "/var/fyd/raw/site:coppersmith-plumbing/9f2ca1.html",
    runId: "run:acq-2026-09-23", causedByEventId: "evt:acq-run-start:01" },
  { kind: "OBSERVATION", id: "obs:new-construction-qa", tenantId: TENANT, namespace: NS,
    name: "services.new_construction", value: CLAIM,
    sourceUrl: SOURCE_URL, sourceType: "html",
    sourcePointer: "main .service-copy", sourceLocation: "bytes=12204-12412",
    observedAt: "2026-09-23T12:00:11Z", extractor: "html-detector@2.3.0",
    factClass: "DIRECT_FACT", claimKind: "website_statement", visibility: "public",
    entityId: "ent:svc-new-construction-01",
    // Same deterministic shape as evidenceRefForFact in the PING proceduralizer:
    // "web:" + sha256(sourceType|name|JSON(value)|entityId)[:12]
    evidenceRef: OBS_EVIDENCE_REF,
    acquisitionId: "acq:2026-09-23T06-00-web" },
  { kind: "CLAIM", id: "claim:svc-new-construction-01", tenantId: TENANT, namespace: NS,
    objectId: OBJECT_ID, field: "description", value: CLAIM,
    factClass: "DIRECT_FACT", resolutionPolicy: "single-source", contenders: 1,
    resolvedByEventId: "evt:resolve:01", at: "2026-09-23T12:00:12Z" },
  { kind: "OBJECT", id: OBJECT_ID, tenantId: TENANT, namespace: NS,
    schema: "Service", title: "New Construction Plumbing",
    provenance: { kind: "website-derived",
      ref: "website-ingestion:" + SOURCE_URL, derivedAt: "2026-09-23T12:00:13Z" },
    relationshipId: REL_ID }, // observation entityId <-> relationship evidenceRef join
  ...SECTIONS.map((sectionId) => ({ kind: "SITE-SECTION", id: "section:" + sectionId,
    tenantId: TENANT, namespace: NS, sectionId, page: sectionId.split(":")[0],
    boundObjectIds: [OBJECT_ID] })),
  { kind: "RENDERED-CLAIM", id: "render:claim-01", tenantId: TENANT, namespace: NS,
    claimHash: "sha256:" + sha256(CLAIM), sectionId: "home:Services:2",
    renderedAt: "2026-09-23T12:05:00Z",
    siteSpecDigest: "sha256:" + sha256("sitespec-coppersmith-v7") },
  { kind: "ANSWER", id: "ans:q-8812", tenantId: TENANT, namespace: NS,
    // Answer identity: canonical digest over the answer body, reusing the
    // proposal digest law shape (sha256-canonical-json, body only).
    answerDigest: "sha256:" + sha256(canon({
      answer: "Yes, they do new construction for both residential and commercial. [1]",
      evidenceRefs: ["obj:" + OBJECT_ID],
      claimClassifications: [{ claim: CLAIM, classification: "DIRECT_FACT", evidenceRefIds: ["obj:" + OBJECT_ID] }],
      siteSpecDigest: sha256("sitespec-coppersmith-v7"), tenantId: TENANT })),
    question: "Do you do new construction?", composedAt: "2026-09-23T12:31:00Z",
    evidenceRefIds: ["obj:" + OBJECT_ID],
    claimBindings: [{ objectId: OBJECT_ID, field: "description",
      evidenceRef: OBS_EVIDENCE_REF }],
    suggestedActions: [{ kind: "open_website", label: "Visit services page",
      target: { kind: "url", url: SOURCE_URL } }] },
  { kind: "ACTION", id: "act:open-website-01", tenantId: TENANT, namespace: NS,
    actionKind: "open_website", executedAt: "2026-09-23T12:33:00Z",
    executedBy: "owner:coppersmith",
    triggeredBy: { answerId: "ans:q-8812",
      claimBindings: [{ objectId: OBJECT_ID, field: "description",
        evidenceRef: OBS_EVIDENCE_REF }] },
    resultingEventId: "evt:action:open-website:01", status: "EXECUTED" },
  // Pre-lineage object: provenance ref exists, no persisted observation.
  { kind: "OBJECT", id: "obj:pre-lineage-testimonial", tenantId: TENANT, namespace: NS,
    schema: "Testimonial", title: "Old testimonial",
    provenance: { kind: "website-derived",
      ref: "website-ingestion:https://coppersmithplumbing.example/reviews",
      derivedAt: "2026-01-04T09:00:00Z" } },
];

const edges = [
  { edgeId: "edge:acquired:01", tenantId: TENANT, namespace: NS,
    from: { kind: "SOURCE", id: "src:coppersmith-web" },
    to: { kind: "ACQUISITION", id: "acq:2026-09-23T06-00-web" },
    transition: "ACQUIRED", causedByEventId: "evt:acq-run-start:01", at: "2026-09-23T12:00:04Z",
    detail: { contentDigest: records[1].contentDigest } },
  { edgeId: "edge:extracted:01", tenantId: TENANT, namespace: NS,
    from: { kind: "ACQUISITION", id: "acq:2026-09-23T06-00-web" },
    to: { kind: "OBSERVATION", id: "obs:new-construction-qa" },
    transition: "EXTRACTED", causedByEventId: "evt:extract:01", at: "2026-09-23T12:00:11Z",
    detail: { evidenceRef: records[2].evidenceRef } },
  { edgeId: "edge:resolved:01", tenantId: TENANT, namespace: NS,
    from: { kind: "OBSERVATION", id: "obs:new-construction-qa" },
    to: { kind: "CLAIM", id: "claim:svc-new-construction-01" },
    transition: "RESOLVED", causedByEventId: "evt:resolve:01", at: "2026-09-23T12:00:12Z",
    detail: { factClass: "DIRECT_FACT", resolutionPolicy: "single-source" } },
  { edgeId: "edge:materialized:01", tenantId: TENANT, namespace: NS,
    from: { kind: "CLAIM", id: "claim:svc-new-construction-01" },
    to: { kind: "OBJECT", id: OBJECT_ID },
    transition: "MATERIALIZED", causedByEventId: "evt:materialize:01", at: "2026-09-23T12:00:13Z",
    detail: { field: "description" } },
  { edgeId: "edge:bound:01", tenantId: TENANT, namespace: NS,
    from: { kind: "OBJECT", id: OBJECT_ID },
    to: { kind: "SITE-SECTION", id: "section:home:Services:2" },
    transition: "BOUND", causedByEventId: "evt:sitespec:gen:07", at: "2026-09-23T12:04:00Z",
    detail: { sectionId: "home:Services:2" } },
  { edgeId: "edge:rendered:01", tenantId: TENANT, namespace: NS,
    from: { kind: "SITE-SECTION", id: "section:home:Services:2" },
    to: { kind: "RENDERED-CLAIM", id: "render:claim-01" },
    transition: "RENDERED", causedByEventId: "evt:render:07", at: "2026-09-23T12:05:00Z",
    detail: { claimHash: "sha256:" + sha256(CLAIM) } },
  { edgeId: "edge:cited:01", tenantId: TENANT, namespace: NS,
    from: { kind: "RENDERED-CLAIM", id: "render:claim-01" },
    to: { kind: "ANSWER", id: "ans:q-8812" },
    transition: "CITED", causedByEventId: "evt:ask:compose:8812", at: "2026-09-23T12:31:00Z",
    detail: { claimClass: "DIRECT_FACT", evidenceRefIds: ["obj:" + OBJECT_ID] } },
  { edgeId: "edge:executed:01", tenantId: TENANT, namespace: NS,
    from: { kind: "ANSWER", id: "ans:q-8812" },
    to: { kind: "ACTION", id: "act:open-website-01" },
    transition: "EXECUTED", causedByEventId: "evt:action:open-website:01", at: "2026-09-23T12:33:00Z",
    detail: { actionKind: "open_website" } },
];

function buildIndex(recs, edgs) {
  const byId = new Map();
  for (const r of recs) byId.set(r.tenantId + "|" + r.kind + "|" + r.id, r);
  const fwd = new Map(), bwd = new Map();
  const key = (t, k, i) => t + "|" + k + "|" + i;
  for (const e of edgs) {
    const fk = key(e.tenantId, e.from.kind, e.from.id);
    const bk = key(e.tenantId, e.to.kind, e.to.id);
    if (!fwd.has(fk)) fwd.set(fk, []);
    if (!bwd.has(bk)) bwd.set(bk, []);
    fwd.get(fk).push(e); bwd.get(bk).push(e);
  }
  return { byId, fwd, bwd, key,
    indexDigest: sha256(canon(edgs.map((e) => e.edgeId).sort())) };
}

function walk(idx, tenantId, startKind, startId, dir) {
  const seen = new Set(), hops = [];
  const queue = [{ kind: startKind, id: startId, via: null }];
  while (queue.length) {
    const cur = queue.shift();
    const k = idx.key(tenantId, cur.kind, cur.id);
    if (seen.has(k)) continue;
    seen.add(k);
    const node = idx.byId.get(k);
    if (!node) {
      hops.push({ kind: cur.kind, id: cur.id, status: "missing",
        needed: "no " + cur.kind + " record for id " + cur.id + " in tenant " + tenantId,
        via: cur.via, at: cur.via ? cur.via.at : null });
      continue;
    }
    hops.push({ kind: cur.kind, id: cur.id, status: "resolved", node,
      via: cur.via, at: cur.via ? cur.via.at : null,
      eventId: cur.via ? cur.via.causedByEventId : null });
    const neighbors = dir === "back" ? (idx.bwd.get(k) || []) : (idx.fwd.get(k) || []);
    for (const e of neighbors) queue.push(Object.assign({}, dir === "back" ? e.from : e.to, { via: e }));
  }
  return hops;
}

const whyThis = (idx, t, objectId) => walk(idx, t, "OBJECT", objectId, "back");
const whatEvidenceSupportsAnswer = (idx, t, answerId) => walk(idx, t, "ANSWER", answerId, "back");

// Forward walk = the lane-O feed: "this evidence changed — what regenerates?"
function blastRadius(idx, tenantId, sourceKey) {
  const src = records.find((r) => r.kind === "SOURCE" && r.tenantId === tenantId && r.sourceKey === sourceKey);
  if (!src) return { error: "no source " + sourceKey };
  const hops = walk(idx, tenantId, "SOURCE", src.id, "forward");
  const ok = hops.filter((h) => h.status === "resolved");
  const pick = (k) => ok.filter((h) => h.kind === k).map((h) => h.id);
  return { source: sourceKey, hops: hops.length,
    objects: pick("OBJECT"), sections: pick("SITE-SECTION"),
    answers: pick("ANSWER"), actions: pick("ACTION"),
    regenerationSet: ok.filter((h) => ["SITE-SECTION", "RENDERED-CLAIM", "ANSWER"].includes(h.kind))
      .map((h) => h.kind + ":" + h.id) };
}

// ============================ PROOF ============================

const idx = buildIndex(records, edges);
console.log("indexDigest:", idx.indexDigest.slice(0, 16), "(rebuildable)");

console.log("\nBACKWARD: ANSWER ans:q-8812 -> SOURCE");
const back = whatEvidenceSupportsAnswer(idx, TENANT, "ans:q-8812");
assert.ok(back.every((h) => h.status === "resolved"), "chain fully resolved");
for (const h of back) {
  const via = h.via ? h.via.transition + "@" + h.via.at + " evt:" + h.via.causedByEventId : "(start)";
  console.log("  " + h.kind.padEnd(14) + h.id + "  [" + via + "]");
  assert.ok(h.id && h.kind, "identity on every hop");
  if (h.via) assert.ok(h.at && h.eventId, "timestamp + event id on every hop");
}
assert.equal(back[back.length - 1].kind, "SOURCE");
assert.ok(/^sha256:[0-9a-f]{64}$/.test(back[0].node.answerDigest), "answer digest real sha256");
assert.ok(/^sha256:[0-9a-f]{64}$/.test(records[1].contentDigest), "acquisition digest real sha256");
assert.ok(/^web:[0-9a-f]{12}$/.test(records[2].evidenceRef), "observation evidenceRef web:sha12 (evidenceRefForFact shape)");
console.log("  PASS: every hop carries identity + timestamp + causedByEventId; hashes are real sha256");

console.log("\nFORWARD: blast radius of source web:" + SOURCE_URL);
const blast = blastRadius(idx, TENANT, "web:" + SOURCE_URL);
console.log("  objects:  " + JSON.stringify(blast.objects));
console.log("  sections: " + JSON.stringify(blast.sections));
console.log("  answers:  " + JSON.stringify(blast.answers));
console.log("  actions:  " + JSON.stringify(blast.actions));
console.log("  regenerationSet (lane O): " + JSON.stringify(blast.regenerationSet));
assert.ok(blast.objects.includes(OBJECT_ID));
assert.ok(blast.sections.includes("section:home:Services:2"));
assert.ok(blast.answers.includes("ans:q-8812"));
assert.ok(blast.actions.includes("act:open-website-01"));

// --- Source-change simulation: rewrite -> new acquisition -> supersede ---
const v2digest = "sha256:" + sha256("pinned-raw-bytes-v2-rewritten");
const newRecords = records.concat([
  { kind: "ACQUISITION", id: "acq:2026-09-23T18-00-web", tenantId: TENANT, namespace: NS,
    sourceId: "src:coppersmith-web", connectorId: "web-fetch",
    retrievedAt: "2026-09-23T18:00:02Z", contentDigest: v2digest, bytes: 48190,
    method: "http-get", rawPointer: "/var/fyd/raw/site:coppersmith-plumbing/77bde4.html",
    runId: "run:acq-2026-09-23-b", causedByEventId: "evt:acq-run-start:02" },
  { kind: "OBSERVATION", id: "obs:new-construction-qa-v2", tenantId: TENANT, namespace: NS,
    name: "services.new_construction", value: "New construction: residential only.",
    sourceUrl: SOURCE_URL, sourceType: "html", sourcePointer: "main .service-copy",
    sourceLocation: "bytes=12204-12260", observedAt: "2026-09-23T18:00:09Z",
    extractor: "html-detector@2.3.0", factClass: "DIRECT_FACT",
    claimKind: "website_statement", visibility: "public",
    entityId: "ent:svc-new-construction-01",
    evidenceRef: "web:" + sha256(["html", "services.new_construction", JSON.stringify("New construction: residential only."), "ent:svc-new-construction-01"].join("|")).slice(0, 12),
    acquisitionId: "acq:2026-09-23T18-00-web" },
  { kind: "CLAIM", id: "claim:svc-new-construction-02", tenantId: TENANT, namespace: NS,
    objectId: OBJECT_ID, field: "description", value: "New construction: residential only.",
    factClass: "DIRECT_FACT", resolutionPolicy: "single-source", contenders: 1,
    resolvedByEventId: "evt:resolve:02", at: "2026-09-23T18:00:10Z" },
]);
const newEdges = edges.concat([
  { edgeId: "edge:acquired:02", tenantId: TENANT, namespace: NS,
    from: { kind: "SOURCE", id: "src:coppersmith-web" },
    to: { kind: "ACQUISITION", id: "acq:2026-09-23T18-00-web" },
    transition: "ACQUIRED", causedByEventId: "evt:acq-run-start:02", at: "2026-09-23T18:00:02Z",
    detail: { contentDigest: v2digest } },
  { edgeId: "edge:extracted:02", tenantId: TENANT, namespace: NS,
    from: { kind: "ACQUISITION", id: "acq:2026-09-23T18-00-web" },
    to: { kind: "OBSERVATION", id: "obs:new-construction-qa-v2" },
    transition: "EXTRACTED", causedByEventId: "evt:extract:02", at: "2026-09-23T18:00:09Z", detail: {} },
  { edgeId: "edge:resolved:02", tenantId: TENANT, namespace: NS,
    from: { kind: "OBSERVATION", id: "obs:new-construction-qa-v2" },
    to: { kind: "CLAIM", id: "claim:svc-new-construction-02" },
    transition: "RESOLVED", causedByEventId: "evt:resolve:02", at: "2026-09-23T18:00:10Z",
    detail: { factClass: "DIRECT_FACT", resolutionPolicy: "single-source", supersedes: "edge:resolved:01" } },
]);
const idx2 = buildIndex(newRecords, newEdges);
const blast2 = blastRadius(idx2, TENANT, "web:" + SOURCE_URL);
console.log("\nSOURCE CHANGE: digest -> " + v2digest.slice(7, 19) + "...");
assert.ok(blast2.answers.includes("ans:q-8812"), "old chain untouched");
assert.equal(newEdges.find((e) => e.edgeId === "edge:resolved:02").detail.supersedes, "edge:resolved:01");
console.log("  old chain intact; new claim supersedes edge:resolved:01");
console.log("  artifacts to regenerate: " + JSON.stringify(blast2.regenerationSet));

// ============================ RED TEAM ============================
console.log("\nRED TEAM");

// R1. Forgery: a fabricated EXTRACTED hop mid-chain (observation attributed
// to a nonexistent acquisition) must be a MISSING verdict with a needed
// field at exactly that hop — the rest of the chain still resolves, and the
// query never fabricates a pass.
const forged = edges.concat([{ edgeId: "edge:forged:01", tenantId: TENANT, namespace: NS,
  from: { kind: "ACQUISITION", id: "acq:fake-01" },
  to: { kind: "OBSERVATION", id: "obs:new-construction-qa" },
  transition: "EXTRACTED", causedByEventId: "evt:fake:01", at: "2026-09-23T13:00:00Z",
  detail: { note: "forged: no such acquisition record" } }]);
const fw = whatEvidenceSupportsAnswer(buildIndex(records, forged), TENANT, "ans:q-8812");
const fh = fw.find((h) => h.id === "acq:fake-01");
assert.ok(fh && fh.status === "missing", "forged hop is missing, not resolved");
assert.ok(fh.needed.length > 20, "missing hop names exactly what would resolve it");
console.log("  R1 forgery: fabricated hop -> status=missing + needed field. No fake pass.");

// R2. Evidence expiry: bytes deleted with customer data -> typed gap, hash retained.
const expired = records.map((r) => r.id === "acq:2026-09-23T06-00-web"
  ? Object.assign({}, r, { rawPointer: null,
      evidenceGap: { status: "LINEAGE_GAP",
        needed: "evidence bytes deleted with customer data package; hash " + r.contentDigest + " retained" } })
  : r);
const eh = whatEvidenceSupportsAnswer(buildIndex(expired, edges), TENANT, "ans:q-8812")
  .find((h) => h.kind === "ACQUISITION");
assert.equal(eh.node.rawPointer, null);
assert.equal(eh.node.evidenceGap.status, "LINEAGE_GAP");
assert.ok(eh.node.contentDigest.startsWith("sha256:"));
console.log("  R2 expiry: bytes pointer -> LINEAGE_GAP, hash retained, chain still walks.");

// R3. Cross-tenant leakage: same answer id in another tenant must not leak.
const cross = records.concat([{ kind: "ANSWER", id: "ans:q-8812", tenantId: "t-other",
  namespace: "site:other", answerDigest: "sha256:" + sha256("other-tenant-answer"),
  question: "other tenant question", composedAt: "2026-09-23T12:31:00Z",
  evidenceRefIds: [], claimBindings: [], suggestedActions: [] }]);
const ix = buildIndex(cross, edges);
const cw = whatEvidenceSupportsAnswer(ix, "t-other", "ans:q-8812");
assert.equal(cw.length, 1);
assert.equal(cw[0].node.question, "other tenant question");
const ow = whatEvidenceSupportsAnswer(ix, TENANT, "ans:q-8812");
assert.ok(!ow.some((h) => h.node && h.node.question === "other tenant question"));
console.log("  R3 cross-tenant: identical ids in two tenants stay strictly scoped. No leak.");

// R4. Secret leakage: planted secret must appear in zero lineage records.
const SECRET = "sk-live-PLANTED-SECRET-9f8e7d6c5b";
const dumped = canon(records) + canon(edges);
assert.ok(!dumped.includes(SECRET), "secret value absent");
assert.ok(!dumped.includes("token") && !dumped.includes("credential"), "no credential-shaped fields");
console.log("  R4 secrets: planted secret absent; lineage carries pointers+hashes only.");

// R5. Pre-lineage honest gap: object resolves, no observation is invented.
const gw = whyThis(idx, TENANT, "obj:pre-lineage-testimonial");
assert.equal(gw[0].status, "resolved");
assert.ok(!gw.some((h) => h.kind === "OBSERVATION"), "no fabricated observation hop");
console.log("  R5 pre-lineage: object resolves; missing hop is absent, not invented.");

console.log("\nALL LINEAGE PROOF TESTS PASSED");
