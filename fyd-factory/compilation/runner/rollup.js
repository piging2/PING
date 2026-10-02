/**
 * Aggregate rollup over results/*.json.
 *
 * Usage: node rollup.js --results-dir <dir> [--json]
 * Prints a human summary, or --json for the machine rollup.
 */
const fs = require("node:fs");
const path = require("node:path");

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return def;
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

const dir = arg("--results-dir");
const asJson = process.argv.includes("--json");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const recs = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

const outcomes = {};
const errTax = {};
const stageLat = { plan: [], spec: [], validate: [], render: [] };
let detMismatch = 0;
let detNull = 0;
let wallSum = 0;
let unsafeSum = 0;
let unboundSum = 0;
let hiddenSum = 0;
let sectionsSum = 0;
// G1/G2/P4 structural accounting.
const harnessVersions = {};
const codeVersions = {};
const dispatchSeqs = {};
let chainIncomplete = 0;
let specBNull = 0;

const CHAIN_FIELDS = ["fixture_digest", "graph_digest", "spec_digest", "spec_digest_b", "findings_digest", "render_digest"];

for (const r of recs) {
  outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1;
  if (r.error_type) errTax[r.error_type] = (errTax[r.error_type] || 0) + 1;
  for (const s of Object.keys(stageLat)) stageLat[s].push(r.stage_ms[s]);
  if (r.determinism_match === false) detMismatch++;
  if (r.determinism_match === null) detNull++;
  wallSum += r.wall_ms;
  unsafeSum += r.unsafe_url_count;
  unboundSum += r.unbound_claim_count;
  hiddenSum += r.hidden_object_count;
  sectionsSum += r.section_count;
  harnessVersions[r.harness_version || "?"] = (harnessVersions[r.harness_version || "?"] || 0) + 1;
  const cv = (r.pipeline_code_version || "?").slice(0, 12);
  codeVersions[cv] = (codeVersions[cv] || 0) + 1;
  dispatchSeqs[String(r.dispatch_seq ?? "?")] = (dispatchSeqs[String(r.dispatch_seq ?? "?")] || 0) + 1;
  if (r.outcome === "OK" && CHAIN_FIELDS.some((f) => !r[f])) chainIncomplete++;
  if (r.outcome === "OK" && r.spec_digest_b == null) specBNull++;
}

const rollup = {
  jobs: recs.length,
  throughput_jobs_per_min: recs.length > 0 && wallSum > 0 ? +(recs.length / (wallSum / 60000)).toFixed(2) : 0,
  avg_wall_ms: recs.length ? Math.round(wallSum / recs.length) : 0,
  stage_latency_ms: Object.fromEntries(
    Object.entries(stageLat).map(([k, v]) => {
      const s = [...v].sort((a, b) => a - b);
      return [k, { p50: pct(s, 50), p95: pct(s, 95), max: s[s.length - 1] ?? 0 }];
    })
  ),
  outcome_distribution: outcomes,
  failure_taxonomy: errTax,
  determinism_mismatch: detMismatch,
  determinism_unknown: detNull,
  versions: {
    harness_version: harnessVersions,
    pipeline_code_version_prefix12: codeVersions,
    dispatch_seq: dispatchSeqs,
  },
  chain_completeness: {
    ok_records_missing_chain_fields: chainIncomplete,
    ok_records_missing_spec_digest_b: specBNull,
  },
  totals: {
    unsafe_url_count: unsafeSum,
    unbound_claim_count: unboundSum,
    hidden_object_count: hiddenSum,
    section_count: sectionsSum,
  },
};

if (asJson) {
  console.log(JSON.stringify(rollup, null, 1));
} else {
  console.log(`jobs: ${rollup.jobs}  throughput: ${rollup.throughput_jobs_per_min}/min  avg wall: ${rollup.avg_wall_ms}ms`);
  console.log("stage latency (p50/p95/max ms):");
  for (const [k, v] of Object.entries(rollup.stage_latency_ms))
    console.log(`  ${k}: ${v.p50}/${v.p95}/${v.max}`);
  console.log("outcomes:", JSON.stringify(outcomes));
  console.log("failures:", JSON.stringify(errTax));
  console.log(`determinism: ${detMismatch} mismatch, ${detNull} unknown`);
  console.log("versions:", JSON.stringify(rollup.versions));
  console.log("chain completeness:", JSON.stringify(rollup.chain_completeness));
  console.log("totals:", JSON.stringify(rollup.totals));
}
