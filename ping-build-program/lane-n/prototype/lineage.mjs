/**
 * LANE N prototype: lineage query functions against synthetic records.
 *
 * Schema-true to LINEAGE-DESIGN.md. Pure Node, zero dependencies.
 * Synthetic data only — no PING repo access, no credentials, no network.
 *
 * Run: node prototype/lineage.mjs
 *
 * Covers the worked example (Sunrise Plumbing phone number) plus:
 *  - a source rewrite (digest change -> supersede chain)
 *  - a conflicting observation from a second source (CONTESTED edge)
 *  - a pre-lineage object (typed LINEAGE_GAP)
 *  - a tombstoned source (upstream deletion)
 *  - the ACTION link (owner tapped Call from an Ask FYD answer)
 */

const TENANT = "t-ping";
const NS = "site:sunrise-plumbing";

// ---------------------------------------------------------------------------
// Synthetic record store (stands in for: journal + persisted observations +
// object graph + SiteSpec + ask answers). Every record carries the fields the
// design requires; hashes are synthetic but shape-true (64 hex).
// ---------------------------------------------------------------------------

const sha = (s) => s.padEnd(64, "0").slice(0, 64);

const DB = {
  sources: [
    { id: "src:sunrise-plumbing-web", sourceKey: "web:https://sunriseplumbinggj.com",
      externalObjectId: "web:https://sunriseplumbinggj.com", liveness: "active", tenantId: TENANT, namespace: NS },
    { id: "src:sunrise-plumbing-fb", sourceKey: "facebook:page:48291",
      externalObjectId: "facebook:page:48291", liveness: "active", tenantId: TENANT, namespace: NS },
    { id: "src:old-domain", sourceKey: "web:https://sunriseplumbing-old.com",
      externalObjectId: "web:https://sunriseplumbing-old.com", liveness: "deleted",
      deletedAt: "2026-09-20T09:14:00Z", tenantId: TENANT, namespace: NS },
  ],
  acquisitions: [
    { id: "acq:web-1", sourceId: "src:sunrise-plumbing-web", connectorId: "web-fetch",
      retrievedAt: "2026-09-23T12:00:04Z", contentDigest: sha("9f2c11aa"), method: "http-get",
      bytes: 48210, rawPointer: "/var/fyd/raw/site:sunrise-plumbing/9f2c11aa.html",
      runId: "run:acq-2026-09-23", causedByEventId: "evt:acq-run-start:0001" },
    { id: "acq:web-2", sourceId: "src:sunrise-plumbing-web", connectorId: "web-fetch",
      retrievedAt: "2026-09-23T18:05:44Z", contentDigest: sha("77bd33cc"), method: "http-get",
      bytes: 48102, rawPointer: "/var/fyd/raw/site:sunrise-plumbing/77bd33cc.html",
      runId: "run:acq-2026-09-23b", causedByEventId: "evt:acq-run-start:0007",
      note: "digest differs from acq:web-1: source rewrote the page" },
    { id: "acq:fb-1", sourceId: "src:sunrise-plumbing-fb", connectorId: "facebook-graph",
      retrievedAt: "2026-09-23T12:30:00Z", contentDigest: sha("c41dd00e"), method: "graph-api",
      bytes: 8210, rawPointer: "/var/fyd/raw/site:sunrise-plumbing/c41dd00e.json",
      runId: "run:acq-2026-09-23", causedByEventId: "evt:acq-run-start:0003" },
  ],
  observations: [
    { id: "obs:phone-web-1", name: "phone", value: "(970) 555-0147",
      sourceUrl: "https://sunriseplumbinggj.com", sourceType: "html",
      sourcePointer: "a[href^=tel:]", sourceLocation: "bytes=12204-12221",
      observedAt: "2026-09-23T12:00:11Z", extractor: "html-detector@2.3.0",
      factClass: "DIRECT_FACT", claimKind: "website_statement", visibility: "public",
      entityId: "ent:sp-phone-01", evidenceRef: "web:4bd91c77e2a0",
      acquisitionId: "acq:web-1" },
    { id: "obs:phone-web-2", name: "phone", value: "(970) 555-0100",
      sourceUrl: "https://sunriseplumbinggj.com", sourceType: "html",
      sourcePointer: "a[href^=tel:]", sourceLocation: "bytes=12190-12207",
      observedAt: "2026-09-23T18:05:51Z", extractor: "html-detector@2.3.0",
      factClass: "DIRECT_FACT", claimKind: "website_statement", visibility: "public",
      entityId: "ent:sp-phone-01", evidenceRef: "web:8f02be19c4d3",
      acquisitionId: "acq:web-2" },
    { id: "obs:phone-fb-1", name: "phone", value: "(970) 555-0199",
      sourceUrl: "https://www.facebook.com/sunriseplumbinggj", sourceType: "html",
      sourcePointer: "page/about", sourceLocation: "bytes=3010-3027",
      observedAt: "2026-09-23T12:30:07Z", extractor: "connector-normalizer@1.1.0",
      factClass: "DIRECT_FACT", claimKind: "website_statement", visibility: "public",
      entityId: "ent:sp-phone-fb", evidenceRef: "web:11aa02f7c9b6",
      acquisitionId: "acq:fb-1" },
  ],
  claims: [
    { id: "claim:phone-v1", objectId: "obj:sunrise-plumbing", field: "fields.phone",
      value: "(970) 555-0147", factClass: "DIRECT_FACT", resolutionPolicy: "single-source",
      contenders: 1, resolvedByEventId: "evt:resolve:0001", at: "2026-09-23T12:00:12Z" },
    { id: "claim:phone-v2", objectId: "obj:sunrise-plumbing", field: "fields.phone",
      value: "(970) 555-0100", factClass: "DIRECT_FACT", resolutionPolicy: "source-rewrite",
      contenders: 1, resolvedByEventId: "evt:resolve:0008", at: "2026-09-23T18:05:52Z",
      supersedes: "claim:phone-v1" },
  ],
  objects: [
    { id: "obj:sunrise-plumbing", schema: "ping.social.business@1", title: "Sunrise Plumbing",
      fields: { phone: "(970) 555-0100" },
      provenance: { kind: "website-derived",
        ref: "website-ingestion:https://sunriseplumbinggj.com",
        updatedRefs: ["website-ingestion:https://www.facebook.com/sunriseplumbinggj"],
        derivedAt: "2026-09-23T18:05:53Z" } },
    // Pre-lineage object: provenance ref exists, but no observation records were persisted.
    { id: "obj:legacy-bakery", schema: "ping.social.business@1", title: "Legacy Bakery",
      fields: { phone: "(970) 555-0000" },
      provenance: { kind: "website-derived",
        ref: "website-ingestion:https://legacybakery.example.com",
        derivedAt: "2026-06-01T10:00:00Z" } },
  ],
  sections: [
    { sectionId: "home:contact", page: "home", component: "ContactSection",
      boundObjectIds: ["obj:sunrise-plumbing"] },
    { sectionId: "home:services", page: "home", component: "ServicesSection",
      boundObjectIds: ["obj:sunrise-plumbing", "obj:svc-drain", "obj:svc-water-heater"] },
  ],
  answers: [
    { id: "ans:q-8812", question: "What is their phone number?",
      answer: "Sunrise Plumbing can be reached at (970) 555-0100 [1].",
      claimClassifications: [
        { classification: "direct", claim: "(970) 555-0100",
          evidenceRefIds: ["obj:sunrise-plumbing"] } ],
      evidenceRefs: [{ id: "obj:sunrise-plumbing", field: "fields.phone",
        evidenceRef: "web:8f02be19c4d3" }],
      at: "2026-09-23T19:02:00Z" },
  ],
  actions: [
    { actionId: "act:call-01", kind: "call", plannedBy: "action-planner@1",
      executedAt: "2026-09-23T19:04:12Z", executedBy: "owner:sp-01",
      triggeredBy: { answerId: "ans:q-8812",
        claimBindings: [{ objectId: "obj:sunrise-plumbing", field: "fields.phone",
          evidenceRef: "web:8f02be19c4d3" }] },
      resultingEventId: "evt:action:call:0001", status: "EXECUTED" },
  ],
  // LineageEdge records: append-only transitions, each with causedByEventId.
  edges: [
    { edgeId: "edge:001", from: { kind: "SOURCE", id: "src:sunrise-plumbing-web" },
      to: { kind: "ACQUISITION", id: "acq:web-1" }, transition: "ACQUIRED",
      causedByEventId: "evt:acq-run-start:0001", at: "2026-09-23T12:00:04Z",
      detail: { contentDigest: sha("9f2c11aa") } },
    { edgeId: "edge:002", from: { kind: "ACQUISITION", id: "acq:web-1" },
      to: { kind: "OBSERVATION", id: "obs:phone-web-1" }, transition: "EXTRACTED",
      causedByEventId: "evt:extract:0002", at: "2026-09-23T12:00:11Z",
      detail: { evidenceRef: "web:4bd91c77e2a0" } },
    { edgeId: "edge:003", from: { kind: "OBSERVATION", id: "obs:phone-web-1" },
      to: { kind: "CLAIM", id: "claim:phone-v1" }, transition: "RESOLVED",
      causedByEventId: "evt:resolve:0001", at: "2026-09-23T12:00:12Z",
      detail: { factClass: "DIRECT_FACT", resolutionPolicy: "single-source" } },
    { edgeId: "edge:004", from: { kind: "CLAIM", id: "claim:phone-v1" },
      to: { kind: "OBJECT-FIELD", id: "obj:sunrise-plumbing#fields.phone" },
      transition: "MATERIALIZED", causedByEventId: "evt:materialize:0001",
      at: "2026-09-23T12:00:13Z", detail: {} },
    // Source rewrite: new acquisition, extraction, resolution superseding v1.
    { edgeId: "edge:005", from: { kind: "SOURCE", id: "src:sunrise-plumbing-web" },
      to: { kind: "ACQUISITION", id: "acq:web-2" }, transition: "ACQUIRED",
      causedByEventId: "evt:acq-run-start:0007", at: "2026-09-23T18:05:44Z",
      detail: { contentDigest: sha("77bd33cc") } },
    { edgeId: "edge:006", from: { kind: "ACQUISITION", id: "acq:web-2" },
      to: { kind: "OBSERVATION", id: "obs:phone-web-2" }, transition: "EXTRACTED",
      causedByEventId: "evt:extract:0008", at: "2026-09-23T18:05:51Z",
      detail: { evidenceRef: "web:8f02be19c4d3" } },
    { edgeId: "edge:007", from: { kind: "OBSERVATION", id: "obs:phone-web-2" },
      to: { kind: "CLAIM", id: "claim:phone-v2" }, transition: "RESOLVED",
      causedByEventId: "evt:resolve:0008", at: "2026-09-23T18:05:52Z",
      detail: { factClass: "DIRECT_FACT", resolutionPolicy: "source-rewrite",
        supersedes: "edge:003" } },
    { edgeId: "edge:008", from: { kind: "CLAIM", id: "claim:phone-v2" },
      to: { kind: "OBJECT-FIELD", id: "obj:sunrise-plumbing#fields.phone" },
      transition: "MATERIALIZED", causedByEventId: "evt:materialize:0008",
      at: "2026-09-23T18:05:53Z", detail: { supersedes: "edge:004" } },
    // Conflict: facebook observation contests the web claim. Both preserved.
    { edgeId: "edge:009", from: { kind: "ACQUISITION", id: "acq:fb-1" },
      to: { kind: "OBSERVATION", id: "obs:phone-fb-1" }, transition: "EXTRACTED",
      causedByEventId: "evt:extract:0004", at: "2026-09-23T12:30:07Z",
      detail: { evidenceRef: "web:11aa02f7c9b6" } },
    { edgeId: "edge:010", from: { kind: "OBSERVATION", id: "obs:phone-fb-1" },
      to: { kind: "CLAIM", id: "claim:phone-v1" }, transition: "CONTESTED",
      causedByEventId: "evt:resolve:0005", at: "2026-09-23T12:30:08Z",
      detail: { factClass: "DIRECT_FACT", resolutionPolicy: "multi-source-tiebreak",
        note: "facebook (970) 555-0199 vs website (970) 555-0147; website won on recency; contender preserved" } },
    // Tombstone: old domain deleted upstream.
    { edgeId: "edge:011", from: { kind: "ACQUISITION", id: "acq:old-410" },
      to: { kind: "SOURCE", id: "src:old-domain" }, transition: "TOMBSTONED",
      causedByEventId: "evt:acq:0009", at: "2026-09-20T09:14:00Z",
      detail: { note: "HTTP 410 on re-acquisition; source marked deleted, node retained" } },
    // Downstream bindings (derived live, recorded here for the prototype).
    { edgeId: "edge:012", from: { kind: "OBJECT-FIELD", id: "obj:sunrise-plumbing#fields.phone" },
      to: { kind: "SITE-SECTION", id: "home:contact" }, transition: "BOUND",
      causedByEventId: "evt:sitespec:0001", at: "2026-09-23T12:01:00Z",
      detail: { sectionId: "home:contact" } },
    { edgeId: "edge:013", from: { kind: "SITE-SECTION", id: "home:contact" },
      to: { kind: "RENDERED-CLAIM", id: "rc:phone-1" }, transition: "RENDERED",
      causedByEventId: "evt:render:0001", at: "2026-09-23T12:01:02Z",
      detail: { claimHash: sha("rendered-(970) 555-0100") } },
    { edgeId: "edge:014", from: { kind: "RENDERED-CLAIM", id: "rc:phone-1" },
      to: { kind: "ANSWER", id: "ans:q-8812" }, transition: "COMPOSED",
      causedByEventId: "evt:ask:0881", at: "2026-09-23T19:02:00Z", detail: {} },
    { edgeId: "edge:015", from: { kind: "ANSWER", id: "ans:q-8812" },
      to: { kind: "CLAIM", id: "claim:phone-v2" }, transition: "CITED",
      causedByEventId: "evt:ask:0881", at: "2026-09-23T19:02:00Z",
      detail: { evidenceRef: "web:8f02be19c4d3" } },
    { edgeId: "edge:016", from: { kind: "ANSWER", id: "ans:q-8812" },
      to: { kind: "ACTION", id: "act:call-01" }, transition: "EXECUTED",
      causedByEventId: "evt:action:call:0001", at: "2026-09-23T19:04:12Z", detail: {} },
  ],
};

// ---------------------------------------------------------------------------
// LineageIndex: derived, rebuildable projection over the record store.
// ---------------------------------------------------------------------------

function buildIndex(db) {
  const byId = new Map();
  for (const coll of ["sources", "acquisitions", "observations", "claims", "objects", "sections", "answers", "actions"]) {
    for (const r of db[coll]) byId.set(r.id ?? r.sectionId ?? r.actionId, r);
  }
  const edgesFrom = new Map(); // "KIND:id" -> edges
  const edgesTo = new Map();
  const key = (ref) => `${ref.kind}:${ref.id}`;
  for (const e of db.edges) {
    const fk = key(e.from), tk = key(e.to);
    if (!edgesFrom.has(fk)) edgesFrom.set(fk, []);
    if (!edgesTo.has(tk)) edgesTo.set(tk, []);
    edgesFrom.get(fk).push(e);
    edgesTo.get(tk).push(e);
  }
  return { byId, edgesFrom, edgesTo, key };
}

const gap = (stage, needed) => ({ stage, status: "gap", pointer: null, excerpt: null, needed });
const resolved = (stage, pointer, excerpt, detail = {}) => ({ stage, status: "resolved", pointer, excerpt, detail });

// Walk upstream from a node following a transition allowlist.
function walkUp(idx, ref, transitions, visit) {
  const out = [];
  const seen = new Set();
  const queue = [ref];
  while (queue.length) {
    const cur = queue.shift();
    const k = idx.key(cur);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const e of idx.edgesTo.get(k) ?? []) {
      if (!transitions.includes(e.transition)) continue;
      out.push(e);
      if (visit) visit(e);
      queue.push(e.from);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Query 1: whyThis(objectId, field) — WHY THIS? Nearest-first chain.
// ---------------------------------------------------------------------------

function whyThis(idx, objectId, field) {
  const obj = idx.byId.get(objectId);
  if (!obj) return [gap("object", `no object ${objectId} in this namespace`)];
  const fieldKey = `${objectId}#${field}`;
  const value = field === "title" ? obj.title : obj.fields?.[field.replace(/^fields\./, "")];
  const links = [resolved("object_field", `${objectId}.${field}`,
    `${field} = ${JSON.stringify(value)}`,
    { provenance: obj.provenance })];

  // MATERIALIZED edge -> claim
  const mat = (idx.edgesTo.get(`OBJECT-FIELD:${fieldKey}`) ?? [])
    .filter((e) => e.transition === "MATERIALIZED")
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (!mat) {
    links.push(gap("claim", `no MATERIALIZED edge for ${fieldKey}; re-materialize from journal or accept the gap`));
    return links;
  }
  const claim = idx.byId.get(mat.to.id === fieldKey ? mat.from.id : mat.from.id);
  links.push(resolved("claim", mat.from.id,
    `claim ${mat.from.id}: ${JSON.stringify(claim?.value)} (${claim?.factClass}, policy ${claim?.resolutionPolicy})`,
    { causedByEventId: mat.causedByEventId, at: mat.at }));

  // RESOLVED edge -> observation (skip SUPERSEDED losers unless contested)
  const res = (idx.edgesTo.get(`CLAIM:${mat.from.id}`) ?? [])
    .filter((e) => ["RESOLVED", "CONTESTED"].includes(e.transition))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const resEdge = res.find((e) => e.transition === "RESOLVED") ?? res[0];
  if (!resEdge) {
    links.push(gap("observation", `no RESOLVED edge into ${mat.from.id}; pre-lineage claim`));
    return links;
  }
  const obs = idx.byId.get(resEdge.from.id);
  if (!obs) {
    links.push(gap("observation", `observation ${resEdge.from.id} not persisted; needed: the extraction pipeline output for evidenceRef ${resEdge.detail?.evidenceRef ?? "unknown"}`));
    return links;
  }
  links.push(resolved("observation", `observations#${obs.id}`,
    `"${obs.name}" = ${JSON.stringify(obs.value)} (${obs.observationType ?? obs.factClass}), ${obs.sourceLocation}`,
    { observedAt: obs.observedAt, extractor: obs.extractor, evidenceRef: obs.evidenceRef, sourceUrl: obs.sourceUrl }));
  const contested = [];
  const allClaimsForField = DB.claims.filter((c) => c.objectId === objectId && c.field === field);
  for (const c of allClaimsForField) {
    for (const e of (idx.edgesTo.get(`CLAIM:${c.id}`) ?? []).filter((x) => x.transition === "CONTESTED")) {
      const co = idx.byId.get(e.from.id);
      contested.push(resolved("contested_observation", `observations#${e.from.id}`,
        `CONTESTED vs ${c.id}: ${JSON.stringify(co?.value)} from ${co?.sourceUrl} — ${e.detail?.note ?? ""}`,
        { causedByEventId: e.causedByEventId }));
    }
  }
  links.push(...contested);

  // EXTRACTED edge -> acquisition
  const ext = (idx.edgesTo.get(`OBSERVATION:${obs.id}`) ?? []).find((e) => e.transition === "EXTRACTED");
  const acq = ext ? idx.byId.get(ext.from.id) : (obs.acquisitionId ? idx.byId.get(obs.acquisitionId) : null);
  if (!acq) {
    links.push(gap("acquisition", `no acquisition record for observation ${obs.id}`));
    return links;
  }
  links.push(resolved("acquisition", `acquisitions#${acq.id}`,
    `fetched ${acq.retrievedAt} via ${acq.connectorId}, sha256 ${acq.contentDigest.slice(0, 12)}...`,
    { contentDigest: acq.contentDigest, retrievedAt: acq.retrievedAt, connectorId: acq.connectorId, method: acq.method }));

  // ACQUIRED edge -> source
  const src = idx.byId.get(acq.sourceId);
  if (!src) {
    links.push(gap("source", `source record ${acq.sourceId} missing`));
    return links;
  }
  links.push(resolved("source", `sources#${src.id}`,
    `${src.sourceKey} (liveness: ${src.liveness})`,
    { externalObjectId: src.externalObjectId, connectorId: acq.connectorId }));
  return links;
}

// ---------------------------------------------------------------------------
// Query 2: whyDidThisChange(objectId, field) — WHY DID THIS CHANGE?
// ---------------------------------------------------------------------------

function whyDidThisChange(idx, objectId, field) {
  const fieldKey = `${objectId}#${field}`;
  const edges = (idx.edgesTo.get(`OBJECT-FIELD:${fieldKey}`) ?? [])
    .filter((e) => ["MATERIALIZED", "SUPERSEDED"].includes(e.transition))
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  return edges.map((e) => {
    const claim = idx.byId.get(e.from.id);
    const cause = e.transition === "SUPERSEDED" ? "superseded"
      : claim?.resolutionPolicy === "source-rewrite" ? "source-rewrite"
      : claim?.resolutionPolicy === "owner-override" ? "owner-override"
      : claim?.resolutionPolicy?.startsWith("multi-source") ? "conflict-resolution"
      : "initial-materialization";
    return { at: e.at, eventId: e.causedByEventId, edgeId: e.edgeId,
      claimId: e.from.id, value: claim?.value ?? null, factClass: claim?.factClass ?? null,
      cause, supersedes: e.detail?.supersedes ?? claim?.supersedes ?? null };
  });
}

// ---------------------------------------------------------------------------
// Query 3: whatBreaksIfSourceDisappears(sourceKey) — blast radius.
// ---------------------------------------------------------------------------

function whatBreaksIfSourceDisappears(idx, sourceKey) {
  const src = DB.sources.find((s) => s.sourceKey === sourceKey);
  if (!src) return { error: `unknown sourceKey ${sourceKey}` };
  const downstream = new Set();
  const queue = [{ kind: "SOURCE", id: src.id }];
  const seen = new Set();
  const nodes = { observations: [], claims: [], objectFields: [], sections: [], answers: [], actions: [] };
  while (queue.length) {
    const cur = queue.shift();
    const k = idx.key(cur);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const e of idx.edgesFrom.get(k) ?? []) {
      downstream.add(e.edgeId);
      const nk = idx.key(e.to);
      const [kind] = e.to.kind.split(":");
      if (e.to.kind === "OBSERVATION") nodes.observations.push(e.to.id);
      if (e.to.kind === "CLAIM") nodes.claims.push(e.to.id);
      if (e.to.kind === "OBJECT-FIELD") nodes.objectFields.push(e.to.id);
      if (e.to.kind === "SITE-SECTION") nodes.sections.push(e.to.id);
      if (e.to.kind === "ANSWER") nodes.answers.push(e.to.id);
      if (e.to.kind === "ACTION") nodes.actions.push(e.to.id);
      if (!seen.has(nk)) queue.push(e.to);
    }
  }
  for (const k of Object.keys(nodes)) nodes[k] = [...new Set(nodes[k])];
  return { sourceKey, liveness: src.liveness,
    ...Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { count: v.length, ids: v }])),
    staleOnDelete: nodes.objectFields,
    note: "deletion marks staleness; values and history are retained, never rewritten" };
}

// ---------------------------------------------------------------------------
// Query 4: whatPageUsesThisObject(objectId) — WHAT PAGE USES THIS OBJECT?
// ---------------------------------------------------------------------------

function whatPageUsesThisObject(idx, objectId) {
  // In production this runs the real resolveQuery per section (never cached).
  // The prototype mirrors it against the recorded BOUND edges + section table.
  const out = [];
  for (const s of DB.sections) {
    const i = s.boundObjectIds.indexOf(objectId);
    if (i >= 0) out.push({ page: s.page, sectionId: s.sectionId, component: s.component,
      boundObjectCount: s.boundObjectIds.length, objectIndexInBinding: i });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Query 5: whatEvidenceSupportsThisAnswer(answerId) — auditor bundle.
// ---------------------------------------------------------------------------

function whatEvidenceSupportsThisAnswer(idx, answerId) {
  const ans = idx.byId.get(answerId);
  if (!ans) return { error: `unknown answer ${answerId}` };
  const bundle = { answerId, question: ans.question, at: ans.at, claims: [] };
  for (const c of ans.claimClassifications ?? []) {
    const entry = { claim: c.claim, classification: c.classification, evidence: [] };
    for (const oid of c.evidenceRefIds ?? []) {
      const obj = idx.byId.get(oid);
      const eref = (ans.evidenceRefs ?? []).find((e) => e.id === oid);
      const obs = DB.observations.find((o) => o.evidenceRef === eref?.evidenceRef);
      const acq = obs ? idx.byId.get(obs.acquisitionId) : null;
      entry.evidence.push({
        objectId: oid, field: eref?.field ?? null,
        factClass: obs?.factClass ?? "unknown",
        observationId: obs?.id ?? null,
        observedAt: obs?.observedAt ?? null,
        extractor: obs?.extractor ?? null,
        sourceUrl: obs?.sourceUrl ?? null,
        sourceLocation: obs?.sourceLocation ?? null,
        evidenceRef: eref?.evidenceRef ?? null,
        contentDigest: acq?.contentDigest ?? null,
        connectorId: acq?.connectorId ?? null,
        objectProvenance: obj?.provenance ?? null,
      });
    }
    bundle.claims.push(entry);
  }
  return bundle;
}

// ---------------------------------------------------------------------------
// Demo: run all five queries + red-team scenarios.
// ---------------------------------------------------------------------------

function main() {
  const idx = buildIndex(DB);
  const show = (title, v) => {
    console.log(`\n=== ${title} ===`);
    console.log(JSON.stringify(v, null, 2));
  };

  show("Q1 whyThis(obj:sunrise-plumbing, fields.phone)",
    whyThis(idx, "obj:sunrise-plumbing", "fields.phone"));
  show("Q1b whyThis(obj:legacy-bakery, fields.phone) — pre-lineage gap",
    whyThis(idx, "obj:legacy-bakery", "fields.phone"));
  show("Q2 whyDidThisChange(obj:sunrise-plumbing, fields.phone)",
    whyDidThisChange(idx, "obj:sunrise-plumbing", "fields.phone"));
  show("Q3 whatBreaksIfSourceDisappears(web:https://sunriseplumbinggj.com)",
    whatBreaksIfSourceDisappears(idx, "web:https://sunriseplumbinggj.com"));
  show("Q4 whatPageUsesThisObject(obj:sunrise-plumbing)",
    whatPageUsesThisObject(idx, "obj:sunrise-plumbing"));
  show("Q5 whatEvidenceSupportsThisAnswer(ans:q-8812)",
    whatEvidenceSupportsThisAnswer(idx, "ans:q-8812"));

  // Red-team checks
  const q1 = whyThis(idx, "obj:sunrise-plumbing", "fields.phone");
  const hasContest = q1.some((l) => l.stage === "contested_observation");
  const q1b = whyThis(idx, "obj:legacy-bakery", "fields.phone");
  const gapHonest = q1b.some((l) => l.status === "gap" && l.needed);
  const q2 = whyDidThisChange(idx, "obj:sunrise-plumbing", "fields.phone");
  const rewriteVisible = q2.some((c) => c.cause === "source-rewrite");
  const q3 = whatBreaksIfSourceDisappears(idx, "web:https://sunriseplumbinggj.com");
  console.log("\n=== RED-TEAM SELF-CHECKS ===");
  console.log(JSON.stringify({
    R1_conflict_preserved_and_visible: hasContest,
    R2_rewrite_chain_intact: rewriteVisible && q2.length === 2,
    R3_prelineage_gap_typed_not_forged: gapHonest,
    R4_no_secrets_in_any_record:
      !JSON.stringify(DB).match(/token|password|secret|bearer/i),
    tenant_scoping_present:
      DB.sources.every((s) => s.tenantId === TENANT),
  }, null, 2));
}

main();
