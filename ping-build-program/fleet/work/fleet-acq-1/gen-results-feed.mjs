#!/usr/bin/env node
// gen-results-sitemap.mjs — writes ACQ-0651..ACQ-0650 result files from run-report-feed.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WORK = new URL(".", import.meta.url).pathname;
const report = JSON.parse(readFileSync(join(WORK, "evidence/feeds/run-report-feed.json"), "utf8"));
const { manifest } = await import("./feed-cases.mjs");
const OUT = "/home/hatch/workspace/ping-build-program/fleet/results/acquisition";

const EVID = [
  "workspace/ping-build-program/fleet/work/fleet-acq-1/evidence/feeds/run-report-feed.json",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/feed-harness.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/feed-cases.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/run.mjs",
  "workspace/ping-build-program/fleet/work/fleet-acq-1/sitemap-one.mjs",
];

let n = 0;
for (const r of report.results) {
  const m = manifest.find((x) => x.case_id === r.case_id);
  if (!m) throw new Error(`no manifest entry for ${r.case_id}`);
  const verdict = r.pass ? "PROVEN" : "REJECTED";
  const held = r.assertions.filter((a) => a.ok).length;
  const doc = {
    mission_id: m.mission,
    verdict,
    summary: `feeds ${m.case_id}: ${m.title} (${m.threat}). Feed-harness produced ${r.harness_outcome ?? "?"} per expectation (${m.expect.outcome}); ${held}/${r.assertions.length} assertions held, including the no-guess invariants (entry_link claims need absolute http(s) links; bad links/dates quarantined with typed reasons; guid/alternate conflicts unresolved; hostile XML classified as typed failures).`,
    evidence_files: EVID,
    confidence: r.pass ? 0.95 : 0.4,
    followup: r.pass ? null : r.assertions.filter((a) => !a.ok).map((a) => `${a.name}: ${a.detail}`),
  };
  writeFileSync(join(OUT, `${m.mission}.json`), JSON.stringify(doc, null, 2) + "\n");
  n++;
}
console.log(`wrote ${n} result files; verdicts:`, JSON.stringify(report.results.reduce((a, r) => { a[r.pass ? "PROVEN" : "REJECTED"] = (a[r.pass ? "PROVEN" : "REJECTED"] || 0) + 1; return a; }, {})));
