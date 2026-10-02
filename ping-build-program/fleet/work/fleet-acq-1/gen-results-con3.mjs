#!/usr/bin/env node
// gen-results-con3.mjs — writes ACQ-1751..ACQ-1800 result files.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/software-connectors/run-report-con-batch3.json"), "utf8"));
const { manifestCon3 } = await import("./con-cases3.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";
const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/software-connectors/run-report-con-batch3.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/con-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/con-cases3.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/con-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];
let n = 0;
for (const r of report.results) {
  const m = manifestCon3.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `software-connectors batch3 ${m.case_id}: ${m.title} (${m.threat}). Connector-config gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n};`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
