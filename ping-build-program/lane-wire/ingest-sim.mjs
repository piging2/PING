#!/usr/bin/env node
/**
 * WIRING WAVE — dry-run milestone proof through the captured /ingest contract.
 *
 * Contract mirrored 1:1 from gateway source (copies in this dir):
 *  - ingest-route.js: required fields (400), namespace auth guard,
 *    201 {eventId, objectId, canonicalHash, canonicalVersion, namespace},
 *    422 on unregistered eventType.
 *  - canon-svc.js: namespace = requested || per-source || 'core::owner';
 *    logical_id = explicit logicalId || timestamp-stripped payload.
 *  - emit (unified_event_runtime.js): eventId = sha256(JSON.stringify(
 *    {eventType, source, namespace, [logical_id|payload]})); INSERT ...
 *    ON CONFLICT (event_id) DO NOTHING -> duplicate => deduplicated:true,
 *    handlers NOT re-triggered.
 *
 * NO network. NO writes to any database. The journal is an in-memory Map.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const WIRE = new URL(".", import.meta.url).pathname;
const read = (p) => readFileSync(p, "utf8");

const registry = JSON.parse(read(`${WIRE}event_registry.json`));
const registered = new Set(registry.events.map((e) => e.event_type));

// ---- envelope sets -------------------------------------------------------
const laneA = read(`${process.env.HOME}/workspace/ping-build-program/lane-a/harvest-area/git-spike/slice/envelopes.jsonl`)
  .split("\n").filter(Boolean).map((l) => ({ ...JSON.parse(l), __src: "lane-a/git" }));
const conn = read(`${WIRE}milestone-envelopes.jsonl`)
  .split("\n").filter(Boolean).map((l) => {
    const e = JSON.parse(l);
    return { ...e, __src: e.source.includes("github") ? "lane-conn/github" : "lane-conn/gbp" };
  });
const all = [...laneA, ...conn];

const NS_RE = /^(core::[A-Za-z0-9_-]+|tenant::[A-Za-z0-9_-]+)$/;
const DEFAULT_NS = "core::owner";
const SHA256_RE = /^[0-9a-f]{64}$/;
const LIFECYCLES = new Set(["observation", "candidate", "knowledge"]);

// ---- contract validation (mirrors ingest-route.js + emit steps 1-3) -------
function validate(env) {
  // 400 checks
  if (!env.source || typeof env.source !== "string") return { http: 400, error: "source (string) required" };
  if (!env.eventType || typeof env.eventType !== "string") return { http: 400, error: "eventType (string) required" };
  if (!env.payload || typeof env.payload !== "object") return { http: 400, error: "payload (object) required" };
  // namespace guard (authorizeNamespace)
  let ns;
  try {
    ns = env.namespace || DEFAULT_NS;
    if (!NS_RE.test(ns)) throw new Error(`Invalid namespace: '${ns}' (must be core::<name> or tenant::<id>)`);
  } catch (e) { return { http: 400, error: e.message }; }
  // registry / governance gate (422)
  if (!registered.has(env.eventType)) return { http: 422, error: `Unknown event_type: ${env.eventType}` };
  if (env.lifecycleStage && !LIFECYCLES.has(env.lifecycleStage)) return { http: 400, error: `lifecycleStage must be observation|candidate|knowledge` };
  if (env.confidence !== undefined && (typeof env.confidence !== "number" || env.confidence < 0 || env.confidence > 1))
    return { http: 400, error: "confidence must be a number in [0,1]" };
  if (env.evidence !== undefined && !Array.isArray(env.evidence)) return { http: 400, error: "evidence must be string[]" };
  for (const ref of env.evidence || []) {
    if (typeof ref !== "string" || !SHA256_RE.test(ref)) return { http: 400, error: `evidence ref not a sha256 hex: ${String(ref).slice(0, 40)}` };
  }
  return { http: 201, namespace: ns };
}

// logical identity: explicit logicalId, else timestamp-stripped payload
function logicalIdentity(env) {
  if (env.logicalId) return env.logicalId;
  const stripped = JSON.parse(JSON.stringify(env.payload, (k, v) =>
    /^(observed_at|fetched_at|acquired_at|ingested_at|timestamp|at)$/i.test(k) ? undefined : v));
  return JSON.stringify(stripped);
}

function eventIdFor(env, namespace) {
  const identity = { eventType: env.eventType, source: env.source };
  identity.namespace = namespace;
  const lid = logicalIdentity(env);
  identity[env.logicalId ? "logical_id" : "payload"] = env.logicalId ? lid : JSON.parse(lid);
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

// ---- simulated journal: ON CONFLICT (event_id) DO NOTHING -----------------
const journal = new Map(); // eventId -> row
let handlerTriggers = 0;
function ingestOne(env) {
  const v = validate(env);
  if (v.http !== 201) return { http: v.http, error: v.error, logicalId: env.logicalId };
  const eventId = eventIdFor(env, v.namespace);
  if (journal.has(eventId)) return { http: 201, deduplicated: true, eventId, logicalId: env.logicalId };
  journal.set(eventId, { event_id: eventId, event_type: env.eventType, source: env.source, namespace: v.namespace });
  handlerTriggers++; // first delivery only — never re-triggered on duplicates
  return { http: 201, deduplicated: false, eventId, logicalId: env.logicalId };
}

// ---- static checks ---------------------------------------------------------
const report = { envelopes: all.length, checks: {} };
const badType = all.filter((e) => !registered.has(e.eventType));
report.checks.eventTypeRegistered = { pass: badType.length === 0, bad: badType.length };
const lids = all.map((e) => `${e.__src}::${e.logicalId}`);
// cross-source collision: same logicalId claimed by two different sources
const lidSources = new Map();
for (const e of all) {
  if (!lidSources.has(e.logicalId)) lidSources.set(e.logicalId, new Set());
  lidSources.get(e.logicalId).add(e.__src);
}
const crossSrc = [...lidSources.entries()].filter(([, s]) => s.size > 1);
report.checks.logicalIdNoCrossSourceCollision = { pass: crossSrc.length === 0, collisions: crossSrc.slice(0, 5) };
// within-source re-observations: legitimate redeliveries the journal absorbs
const dupLids = lids.filter((x, i) => lids.indexOf(x) !== i);
report.checks.withinSourceRedeliveries = { count: dupLids.length, examples: [...new Set(dupLids)].slice(0, 5) };
const evBad = all.filter((e) => !(Array.isArray(e.evidence) && e.evidence.length > 0 && e.evidence.every((r) => SHA256_RE.test(r))));
report.checks.evidenceWellFormed = { pass: evBad.length === 0, bad: evBad.length };
const lcBad = all.filter((e) => e.lifecycleStage === undefined || e.confidence === undefined);
report.checks.lifecycleConfidencePresent = { pass: lcBad.length === 0, bad: lcBad.length };
const types = [...new Set(all.map((e) => e.eventType))];
report.checks.eventTypesUsed = types;
report.checks.perSource = {
  "lane-a/git": laneA.length,
  "lane-conn/github": conn.filter((e) => e.__src === "lane-conn/github").length,
  "lane-conn/gbp": conn.filter((e) => e.__src === "lane-conn/gbp").length,
};

// negative probes: unregistered type -> 422; missing source -> 400
const probe422 = ingestOne({ source: "x", eventType: "NOT_A_REAL_TYPE", payload: {} });
const probe400 = ingestOne({ eventType: "OBJECT_CREATED", payload: {} });
report.checks.negative422 = { pass: probe422.http === 422 };
report.checks.negative400 = { pass: probe400.http === 400 };

// ---- idempotency simulation: submit everything twice ------------------------
const run1 = all.map(ingestOne);
const rowsAfter1 = journal.size;
const trigAfter1 = handlerTriggers;
const run2 = all.map(ingestOne);
const rowsAfter2 = journal.size;
const secondAllDedup = run2.every((r) => r.deduplicated === true);
const firstNoneDedup = run1.every((r) => r.deduplicated === false);
report.checks.idempotency = {
  pass: secondAllDedup && rowsAfter2 === rowsAfter1 && handlerTriggers === trigAfter1
    && (rowsAfter1 === all.length - report.checks.withinSourceRedeliveries.count),
  firstRun201s: run1.filter((r) => r.http === 201).length,
  secondRunDedup: run2.filter((r) => r.deduplicated).length,
  rows: rowsAfter2,
  handlerTriggers,
};
const all201 = run1.every((r) => r.http === 201);
report.checks.allFirstRun201 = { pass: all201 };

// deterministic eventId stability: recompute on resubmit, IDs identical
const ids1 = run1.map((r) => r.eventId);
const ids2 = run2.map((r) => r.eventId);
report.checks.eventIdStable = { pass: ids1.every((id, i) => id === ids2[i]) };

console.log(JSON.stringify(report, null, 2));
const failed = Object.entries(report.checks).filter(([, c]) => c.pass === false);
if (failed.length) { console.error("FAILED CHECKS:", failed.map(([k]) => k).join(", ")); process.exit(1); }
console.error(`ALL CHECKS PASS — ${all.length} envelopes, ${journal.size} journal rows`);
