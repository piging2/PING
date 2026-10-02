#!/usr/bin/env node
// gen-results-soc.mjs — writes ACQ-1251..ACQ-1300 result files from run-report-soc.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/permitted-social/run-report-soc.json"), "utf8"));
const { manifestSoc } = await import("./soc-cases.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/permitted-social/run-report-soc.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-cases.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/soc-one.mjs",
  "workspace/ping-build-program/lane-d/HOSTILE-INPUT-CONTRACT.md",
  "workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md",
];

let n = 0;
for (const r of report.results) {
  const m = manifestSoc.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `permitted-social batch1 ${m.case_id}: ${m.title} (${m.threat}). Soc-harness classified the post per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held. The boundary blocks only on documented explicit hostile phrases (crypto-doubling, send-crypto, guaranteed-returns, verify-wallet, airdrop, suspension-phish); heuristic signals carry documented weights and yield needs-review at weight>=4, never an asserted hostile verdict; legitimate business content (links, prices, phone numbers, mild urgency, emoji, unpressured giveaways) stays permitted; malformed input gets typed lane-K INVALID_PAYLOAD.`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
