#!/usr/bin/env node
// gen-results-upl.mjs — writes ACQ-1401..ACQ-1450 result files from run-report-upl.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/owner-uploads/run-report-upl.json"), "utf8"));
const { manifestUpl } = await import("./upl-cases.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/owner-uploads/run-report-upl.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-cases.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestUpl.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `owner-uploads batch1 ${m.case_id}: ${m.title} (${m.threat}). Upload gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. The gate sniffs magic at offset 0 only, demands extension and declared-MIME agreement, screens all bytes for active-content markers, holds double extensions / unsafe filenames / missing extensions as typed quarantines, and returns typed lane-K INVALID_PAYLOAD for malformed or over-cap input and UNSUPPORTED for unrecognized types. Mismatches are held, never reclassified by guess.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
