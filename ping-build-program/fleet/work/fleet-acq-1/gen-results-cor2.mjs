#!/usr/bin/env node
// gen-results-cor2.mjs — writes ACQ-1601..ACQ-1650 result files from run-report-cor-batch2.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/owner-corrections/run-report-cor-batch2.json"), "utf8"));
const { manifestCorr2 } = await import("./corr-cases2.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/owner-corrections/run-report-cor-batch2.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-cases2.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/corr-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestCorr2.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `owner-corrections batch2 ${m.case_id}: ${m.title} (${m.threat}). Correction gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. Second wave: per-field cap boundaries, URL edge shapes (userinfo, IPv6, scheme-relative, mailto/tel/data), submitter edges, old_value handling, and literal-marker boundaries (split markers and percent-encoding are not decoded by the gate; tabs are rejected because WHATWG would silently strip them).`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
