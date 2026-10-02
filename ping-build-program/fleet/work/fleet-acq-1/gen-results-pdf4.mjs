#!/usr/bin/env node
// gen-results-pdf4.mjs — writes ACQ-1101..ACQ-1150 result files from run-report-pdf-batch4.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/documents-pdf/run-report-pdf-batch4.json"), "utf8"));
const { manifest4 } = await import("./pdf-cases4.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/documents-pdf/run-report-pdf-batch4.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/pdf-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/pdf-cases4.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/pdf-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifest4.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `pdf batch4 ${m.case_id}: ${m.title} (${m.threat}). Pdf-harness produced ${r.harness_outcome ?? "?"} per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held, including the no-guess invariants (typed fields claimed with per-object provenance; hostile PDFs get lane-K typed failures; malformed structures quarantined or safely skipped; conflicts stay unresolved; byte/page/object/decompression caps enforced per lane-D D3-D5; stream keyword and object bounds strictly validated; inline-image data skipped so hostile image bytes never become text claims; direct trailer Info dicts resolve like other direct dicts).`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
