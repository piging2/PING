'use strict';
// verify-matrix.js - run-id gating check for kill-matrix-results.jsonl
const fs = require('fs');
const path = require('path');
const DIR = process.argv[2] || '/home/nolan/workspace/orca/unknown-outcome-experiments';
const lines = fs.readFileSync(path.join(DIR, 'kill-matrix-results.jsonl'), 'utf8').split('\n').filter(l => l.trim());
const runs = {};
for (const line of lines) {
  const r = JSON.parse(line);
  (runs[r.run_id] = runs[r.run_id] || []).push(r);
}
const keys = Object.keys(runs);
const latest = keys[keys.length - 1];
const recs = runs[latest];
console.log('total_records=' + lines.length);
console.log('distinct_run_ids=' + keys.length);
console.log('latest_run_id=' + latest);
console.log('latest_record_count=' + recs.length);
const points = recs.map(r => r.kill_point).sort((a, b) => a - b);
console.log('latest_points=' + JSON.stringify(points));
const counts = {};
let maxC = 0;
for (const r of recs) {
  const ev = r.effect_evidence || {};
  const c = ev.true_effect_count != null ? ev.true_effect_count : ev.effect_count;
  counts[r.kill_point] = c;
  if (c > maxC) maxC = c;
}
console.log('latest_effect_counts=' + JSON.stringify(counts));
console.log('max_effect_count_latest=' + maxC);
console.log('resolutions=' + JSON.stringify(recs.map(r => r.kill_point + ':' + (r.reconciliation_state && r.reconciliation_state.reconcile && r.reconciliation_state.reconcile.resolution) + '/' + (r.reconciliation_state && r.reconciliation_state.reconcile && r.reconciliation_state.reconcile.via))));
