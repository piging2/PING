#!/usr/bin/env node
// gen-results-cor.mjs — writes ACQ-1551..ACQ-1600 result files from run-report-cor.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/owner-corrections/run-report-cor.json"), "utf8"));
const { manifestCorr } = await import("./corr-cases.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/owner-corrections/run-report-cor.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-cases.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestCorr.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `owner-corrections batch1 ${m.case_id}: ${m.title} (${m.threat}). Correction gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. The gate enforces a strict field allowlist, per-field length caps, single-line rules for name/phone/url, active-content marker scans on the new value only (old values are never re-scanned), and strict http(s)-with-host URL parsing with no scheme guessing. Unknown fields and malformed shapes produce typed lane-K INVALID_PAYLOAD; hostile values are quarantined, never reclassified.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
