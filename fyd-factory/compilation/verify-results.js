// Per-shard verification for FYD graph-compilation shards.
// Checks: jsonl 500 lines / 500 unique job_ids; rollup outcome distribution;
// determinism mismatches = 0; unsafe_url_count = 0; hidden_object_count = 0;
// harness_version 1.2.0; pipeline_code_version prefix bec90864d8ed.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const BASE = "/home/nolan/fyd-compile-harness";
const shards = process.argv.slice(2);
let allOk = true;

for (const x of shards) {
  console.log(`\n===== shard-${x} =====`);
  let ok = true;

  // 1. jsonl line count + unique job_ids
  const jlPath = `${BASE}/results-shard-${x}.jsonl`;
  const jlLines = fs.readFileSync(jlPath, "utf8").split("\n").filter((l) => l.trim());
  const jlIds = new Set();
  for (const l of jlLines) jlIds.add(JSON.parse(l).job_id);
  const jlOk = jlLines.length === 500 && jlIds.size === 500;
  if (!jlOk) ok = false;
  console.log(`jsonl: lines=${jlLines.length} unique_job_ids=${jlIds.size} ${jlOk ? "OK" : "FAIL"}`);

  // 2+ rollup over results-dir
  const roll = JSON.parse(execFileSync("node", [`${BASE}/runner/rollup.js`, "--results-dir", `${BASE}/results-shard-${x}`, "--json"], { encoding: "utf8" }));
  const outcomes = roll.outcome_distribution || {};
  const recCount = roll.jobs || 0;
  console.log(`rollup records=${recCount} outcomes=${JSON.stringify(outcomes)}`);
  if (recCount !== 500 || outcomes.COMPILED !== 500) { ok = false; console.log("OUTCOME CHECK FAIL"); }

  // 3. determinism
  const detMis = roll.determinism_mismatch ?? null;
  console.log(`determinism_mismatches=${detMis} ${detMis === 0 ? "OK" : "FAIL"}`);
  if (detMis !== 0) ok = false;

  // 4. safety counts
  const unsafe = roll.totals ? roll.totals.unsafe_url_count : null;
  const hidden = roll.totals ? roll.totals.hidden_object_count : null;
  console.log(`unsafe_url_sum=${unsafe} hidden_object_sum=${hidden} ${(unsafe === 0 && hidden === 0) ? "OK" : "FAIL"}`);
  if (unsafe !== 0 || hidden !== 0) ok = false;

  // 6. versions
  const hv = (roll.versions && roll.versions.harness_version) || {};
  const cv = (roll.versions && roll.versions.pipeline_code_version_prefix12) || {};
  const hvOk = Object.keys(hv).length === 1 && hv["1.2.0"] === 500;
  const cvOk = Object.keys(cv).length === 1 && cv["bec90864d8ed"] === 500;
  console.log(`harness_versions=${JSON.stringify(hv)} ${hvOk ? "OK" : "FAIL"}`);
  console.log(`code_versions=${JSON.stringify(cv)} ${cvOk ? "OK" : "FAIL"}`);
  if (!hvOk || !cvOk) ok = false;

  // jsonl records cross-check: every record COMPILED, det true, versions bound
  let jlBad = 0;
  for (const l of jlLines) {
    const r = JSON.parse(l);
    if (r.outcome !== "COMPILED" || r.determinism_match !== true ||
        r.harness_version !== "1.2.0" ||
        !(r.pipeline_code_version || "").startsWith("bec90864d8ed") ||
        r.unsafe_url_count !== 0 || r.hidden_object_count !== 0) jlBad++;
  }
  console.log(`jsonl record cross-check bad=${jlBad} ${jlBad === 0 ? "OK" : "FAIL"}`);
  if (jlBad !== 0) ok = false;

  console.log(`shard-${x}: ${ok ? "ALL CHECKS PASS" : "CHECKS FAILED"}`);
  if (!ok) allOk = false;
}
console.log(allOk ? "\nVERIFY: PASS" : "\nVERIFY: FAIL");
process.exit(allOk ? 0 : 1);
