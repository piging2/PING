'use strict';
// verify-chaos.js - run-id gating check for chaos-results.jsonl
const fs = require('fs');
const path = require('path');
const DIR = process.argv[2] || '/home/nolan/workspace/orca/unknown-outcome-experiments';
const lines = fs.readFileSync(path.join(DIR, 'chaos-results.jsonl'), 'utf8').split('\n').filter(l => l.trim());
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
const names = recs.map(r => r.chaos).sort();
console.log('latest_scenarios=' + JSON.stringify(names));
const fails = recs.filter(r => r.verdict === 'FAIL');
console.log('latest_fails=' + JSON.stringify(fails.map(r => r.chaos)));
