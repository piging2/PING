#!/usr/bin/env node
// gen-results-jsh.mjs — writes ACQ-2151..ACQ-2200 result files from the
// js-heavy batch-1 run report.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/js-heavy/run-report-jsh.json"), "utf8"));
const { manifestJsh } = await import("./jsh-cases.mjs");
if (report.parser !== "jsh-1.0.0") throw new Error(`harness version mismatch: ${report.parser}`);
if (report.cases_failed !== 0 || report.cases_passed !== 50) {
  throw new Error(`batch 1 not green: passed=${report.cases_passed} failed=${report.cases_failed}`);
}
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";
const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/js-heavy/run-report-jsh.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/jsh-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/jsh-cases.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/jsh-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];
let n = 0;
for (const r of report.results) {
  const m = manifestJsh.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `js-heavy batch1 ${m.case_id}: ${m.title} (${m.threat}). JS-render gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n};`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
