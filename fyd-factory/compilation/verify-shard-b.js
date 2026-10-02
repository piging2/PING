const fs = require('node:fs');
const lines = fs.readFileSync('/home/nolan/fyd-compile-harness/results-shard-b.jsonl', 'utf8').trim().split('\n');
const recs = lines.map(l => JSON.parse(l));
const ids = new Set(recs.map(r => r.job_id));
const outcomes = {};
let inputUnsafe = 0, outputUnsafe = 0, detMM = 0, detNull = 0, hidden = 0;
const hv = {}, cv = {}, ds = {};
for (const r of recs) {
  outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1;
  inputUnsafe += r.input_unsafe_url_count || 0;
  outputUnsafe += r.unsafe_url_count || 0;
  hidden += r.hidden_object_count || 0;
  if (r.determinism_match === false) detMM++;
  if (r.determinism_match == null) detNull++;
  hv[r.harness_version] = (hv[r.harness_version] || 0) + 1;
  const p = String(r.pipeline_code_version || '').slice(0, 12);
  cv[p] = (cv[p] || 0) + 1;
  ds[r.dispatch_seq] = (ds[r.dispatch_seq] || 0) + 1;
}
console.log(JSON.stringify({
  jsonl_lines: lines.length,
  unique_job_ids: ids.size,
  outcomes,
  input_unsafe_url_count: inputUnsafe,
  unsafe_url_count: outputUnsafe,
  determinism_mismatch: detMM,
  determinism_null: detNull,
  hidden_object_count: hidden,
  harness_versions: hv,
  code_version_prefix12: cv,
  dispatch_seq: ds
}, null, 1));
