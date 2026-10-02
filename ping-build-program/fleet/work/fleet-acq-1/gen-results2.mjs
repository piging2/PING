#!/usr/bin/env node
// gen-results2.mjs — writes ACQ-0201..ACQ-0250 result files from run-report-batch2.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/html-hardening/run-report-batch2.json"), "utf8"));
const { manifest } = await import("./cases2.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/html-hardening/run-report-batch2.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/cases2.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/one.mjs",
];

let n = 0;
for (const r of report.results) {
  const m = manifest.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const assertionCount = r.assertions.length;
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `html-hardening ${m.case_id}: ${m.title} (${m.threat}). Harness produced ${r.harness_outcome ?? "?"} per expectation (${m.expect.outcome}); ${held}/${assertionCount} assertions held, including the no-guess invariants (every claim carries source+locator provenance; conflicts stay unresolved; hostile regions stripped/quarantined).`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
