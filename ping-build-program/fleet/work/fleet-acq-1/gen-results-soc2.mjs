#!/usr/bin/env node
// gen-results-soc2.mjs — writes ACQ-1301..ACQ-1350 result files from run-report-soc-batch2.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/permitted-social/run-report-soc-batch2.json"), "utf8"));
const { manifestSoc2 } = await import("./soc-cases2.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/permitted-social/run-report-soc-batch2.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-cases2.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestSoc2.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `permitted-social batch2 ${m.case_id}: ${m.title} (${m.threat}). Soc-harness classified the post per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. This wave probed regex boundaries (word-boundary denials like 'cryptocurrency'/'expiration'/'free gifts', exact caps 50% and emoji 10 thresholds, one-shot-per-rule signal counting, first-block-rule-wins ordering, truncation interplay with block phrases), obfuscation that literal rules must NOT match (leet-speak, fullwidth), and malformed shapes (null/undefined/array/numeric input) producing typed lane-K INVALID_PAYLOAD.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
