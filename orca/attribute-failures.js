'use strict';
// attribute-failures.js - per-run attribution of assert.js failures.
// Replicates assert.js's two scan-all-history rules (provider-probe-terminal
// Rule 7 and the chaos-verdict rollup) with run_id attached. Does not
// re-implement the invariant rules (1-6); those produced zero failures in
// the assert.js output and are read-only rules over matrix records.
const fs = require('fs');
const path = require('path');
const DIR = process.argv[2] || '/home/nolan/workspace/orca/unknown-outcome-experiments';
const chaos = fs.readFileSync(path.join(DIR, 'chaos-results.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

const INVARIANT_RULES = ['no-unknown-to-failed', 'no-unknown-to-success', 'no-blind-retry', 'exactly-once', 'reconcile-ran', 'held-holds', 'recovered-result-carried', 'missing-state'];

for (const rec of chaos) {
  if (rec.chaos === 'T-succ' && rec.verdict === 'PASS') {
    const pp = rec.provider_probe || {};
    if (pp.proof === 'none' || !(pp.effectCount >= 1)) {
      console.log(`FAIL provider-probe-terminal run=${rec.run_id} chaos=T-succ verdict=PASS proof=${pp.proof} effectCount=${pp.effectCount} accepted=${pp.accepted}`);
    }
  }
  if (rec.chaos === 'T-fail' && rec.verdict === 'PASS') {
    const pph = rec.provider_probe_hard || {};
    if (pph.proof !== 'none') console.log(`FAIL provider-probe-terminal run=${rec.run_id} chaos=T-fail verdict=PASS proof=${pph.proof}`);
  }
  if (rec.chaos === 'T-never' && rec.verdict === 'PASS') {
    const pp = rec.provider_probe || {};
    if (pp.proof !== 'none') console.log(`FAIL provider-probe-terminal run=${rec.run_id} chaos=T-never verdict=PASS proof=${pp.proof}`);
  }
  if (rec.verdict === 'FAIL') {
    console.log(`FAIL chaos-verdict run=${rec.run_id} chaos=${rec.chaos} detail=${(rec.detail || '').slice(0, 120)}`);
  }
}
console.log('INVARIANT_RULES (from assert.js output): ' + INVARIANT_RULES.join(',') + ' — zero failures observed in assert.js output');
