#!/usr/bin/env node
/**
 * WIRING WAVE — restart/recovery proof (lane M registry + lane R lab fixture).
 *
 * Scenario: a connector run dies mid-fetch (crash injected before
 * commitCheckpoint). Required recovery behavior per lane-M §5.2:
 *   1. checkpoint unmoved (commit-first advance; crash before commit);
 *   2. next run resumes from the OLD checkpoint;
 *   3. re-fetched observations are absorbed by the idempotent journal —
 *      no duplicate rows (dedupe by logicalId/eventId);
 *   4. checkpoint advances only after the recovery run commits.
 *
 * NO network, NO database. In-memory journal mirrors ON CONFLICT DO NOTHING.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const fixture = JSON.parse(readFileSync(
  `${process.env.HOME}/workspace/ping-build-program/lane-r/lab/fixtures/github-issues-paginated.fixture.json`, "utf8"));
const PAGES = fixture.steps.filter((s) => s.kind === "request")
  .map((s) => ({ id: s.id, records: s.response.body }));

// ---- journal (idempotent, mirrors UnifiedEventRuntime.emit step 5) ----------
const journal = new Map();
function emitObservation(env) {
  const eventId = sha256(JSON.stringify({ eventType: "OBJECT_CREATED", source: env.source, namespace: "core::owner", logical_id: env.logicalId }));
  if (journal.has(eventId)) return { deduplicated: true, eventId };
  journal.set(eventId, env.logicalId);
  return { deduplicated: false, eventId };
}

// ---- registry (lane M §5.1/5.2 semantics) ------------------------------------
const registry = {
  checkpoints: { "github-connector|issues": {
    kind: "cursor", value: "page-0", valueSha256: sha256("page-0"),
    normalizerVersion: "0.1.0", eventSeqFloor: 0, committedAt: "2026-09-23T18:00:00Z", quarantined: false } },
  beginRun(sourceId, stream) {
    const cp = this.checkpoints[`${sourceId}|${stream}`];
    return { lease: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, checkpoint: { ...cp } };
  },
  commitCheckpoint(sourceId, stream, runLease, newValue, rowsCovered) {
    const key = `${sourceId}|${stream}`;
    const cur = this.checkpoints[key];
    const candidate = {
      kind: cur.kind, value: newValue, valueSha256: sha256(newValue),
      normalizerVersion: cur.normalizerVersion, eventSeqFloor: rowsCovered,
      committedAt: new Date().toISOString(), quarantined: false };
    if (candidate.eventSeqFloor < cur.eventSeqFloor) throw new Error("non-monotonic checkpoint");
    this.checkpoints[key] = candidate; // advance only here
    return candidate;
  },
};

// ---- observation mapping ------------------------------------------------------
const SOURCE = "connector:github-connector:lab-recovery";
function toEnvelope(rec) {
  const canonicalId = `obs_github-connector_${sha256(`github-connector:issue:${rec.id}`).slice(0, 32)}`;
  return { source: SOURCE, eventType: "OBJECT_CREATED", logicalId: canonicalId,
           evidence: [sha256(JSON.stringify(rec))], lifecycleStage: "observation",
           payload: { kind: "github_issue", number: rec.number, title: rec.title, state: rec.state } };
}

function fetchFrom(checkpointValue) {
  const idx = PAGES.findIndex((p) => p.id === checkpointValue);
  return PAGES.slice(idx + 1); // resume AFTER the committed checkpoint
}

const results = {};
// run 0: baseline — page-1 committed
{
  const { checkpoint } = registry.beginRun("github-connector", "issues");
  for (const p of fetchFrom(checkpoint.value)) {
    for (const r of p.records) emitObservation(toEnvelope(r));
    if (p.id === "page-1") break; // stop after page-1 for the baseline
  }
  registry.commitCheckpoint("github-connector", "issues", "lease-0", "page-1", journal.size);
  results.baseline = { checkpoint: registry.checkpoints["github-connector|issues"].value, rows: journal.size };
}
// run 1: resume from page-1, fetch pages 2-3, emit, then CRASH before commit
{
  const { lease, checkpoint } = registry.beginRun("github-connector", "issues");
  results.crashRun = { startedFrom: checkpoint.value };
  for (const p of fetchFrom(checkpoint.value)) for (const r of p.records) emitObservation(toEnvelope(r));
  // *** crash injected here: commitCheckpoint never called ***
  results.crashRun.checkpointAfterCrash = registry.checkpoints["github-connector|issues"].value;
  results.crashRun.rowsAfterCrash = journal.size;
}
// run 2 (recovery): must resume from the OLD checkpoint; re-emit dedupes
{
  const { lease, checkpoint } = registry.beginRun("github-connector", "issues");
  results.recoveryRun = { startedFrom: checkpoint.value };
  let deduped = 0, inserted = 0;
  for (const p of fetchFrom(checkpoint.value)) {
    for (const r of p.records) { emitObservation(toEnvelope(r)).deduplicated ? deduped++ : inserted++; }
  }
  registry.commitCheckpoint("github-connector", "issues", lease, "page-3", journal.size);
  results.recoveryRun.deduped = deduped; results.recoveryRun.inserted = inserted;
  results.recoveryRun.checkpointAfter = registry.checkpoints["github-connector|issues"].value;
}
results.journalRows = journal.size;
results.uniqueRecords = new Set(journal.values()).size;

const pass =
  results.baseline.checkpoint === "page-1" &&
  results.crashRun.startedFrom === "page-1" &&
  results.crashRun.checkpointAfterCrash === "page-1" &&           // unmoved by crash
  results.recoveryRun.startedFrom === "page-1" &&                 // resumed from old checkpoint
  results.recoveryRun.deduped === 4 && results.recoveryRun.inserted === 0 &&  // no duplicate rows
  results.recoveryRun.checkpointAfter === "page-3" &&            // advanced only after commit
  results.journalRows === 7 && results.uniqueRecords === 7;      // no loss, no dupes
results.pass = pass;
console.log(JSON.stringify(results, null, 2));
process.exit(pass ? 0 : 1);
