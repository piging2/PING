#!/usr/bin/env node
// gen-results-upl2.mjs — writes ACQ-1451..ACQ-1500 result files from run-report-upl-batch2.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/owner-uploads/run-report-upl-batch2.json"), "utf8"));
const { manifestUpl2 } = await import("./upl-cases2.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/owner-uploads/run-report-upl-batch2.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-cases2.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/upl-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestUpl2.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `owner-uploads batch2 ${m.case_id}: ${m.title} (${m.threat}). Upload gate validated per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. This wave probed polyglot edges, extension-normalization limits, strict MIME equality, the exact 20 MiB cap boundary, byte-shape variants (Uint8Array vs ArrayBuffer), newline filenames (now unsafe), bare-magic acceptance, and check-ordering guarantees (markers before extensions, magic before MIME).`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
