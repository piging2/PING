#!/usr/bin/env node
// gen-results-cfl3.mjs — writes ACQ-1901..ACQ-1950 result files from the
// conflict-sources batch-3 run report.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/conflict-sources/run-report-cfl-batch3.json"), "utf8"));
const { manifestCfl3 } = await import("./cfl-cases3.mjs");
if (report.parser !== "cfl-1.0.0") throw new Error(`harness version mismatch: ${report.parser}`);
if (report.cases_failed !== 0 || report.cases_passed !== 50) {
  throw new Error(`batch 3 not green: passed=${report.cases_passed} failed=${report.cases_failed}`);
}
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";
const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/conflict-sources/run-report-cfl-batch3.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/cfl-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/cfl-cases3.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/cfl-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];
let n = 0;
for (const r of report.results) {
  const m = manifestCfl3.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `conflict-sources batch3 ${m.case_id}: ${m.title} (${m.threat}). Conflict gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n};`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
