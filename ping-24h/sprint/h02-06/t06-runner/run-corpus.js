'use strict';
/**
 * T-06 corpus runner - HARNESS ONLY, NOT PRODUCT CODE.
 *
 * Executes the three HOLD/recovery implementations against THE SAME eight
 * Wave B fixtures and verdicts each cell CORRECT / INCORRECT / INAPPLICABLE
 * against the invariant:
 *   UNKNOWN EFFECT -> HOLD -> RECONCILE -> PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION
 *
 * Usage: node run-corpus.js
 * Writes: results.json (full per-cell observations + evidence).
 * Exit code is always 0: verdicts are data, not failures.
 */
const fs = require('fs');
const path = require('path');

const IMPLS = {
  f01: {
    label: 'f01 (narrowed reaper + parkHold + reconcileHold)',
    src: '~/workspace/f01-fix/mission_runtime.js (+ fake_mission_pool.js)',
    mod: './harness/h-f01.js',
  },
  s5: {
    label: 'S5 (reconcile gate on the dispatch path)',
    src: 'branch mc/lane-c-reconcile-gate commit 25e33e9, orca-adapter/adapter.js v1.2.0',
    mod: './harness/h-s5.js',
  },
  classify: {
    label: 'classifyUnknownExecution (pure decision function)',
    src: 'tenanos-wave/scratch/swarm02-103/src/tenanos/run/run-state-authority.ts',
    mod: './harness/h-classify.js',
  },
};

const FIXTURES = {
  f01: 'fixture-01: unknown external effect (ack lost after dispatch)',
  f02: 'fixture-02: lease expiration after possible effect',
  f03: 'fixture-03: death after effect before ack',
  f04: 'fixture-04: death after result before journaling (effect proven)',
  f05: 'fixture-05: duplicate submission',
  f06: 'fixture-06: zombie result',
  f07: 'fixture-07: restart with HOLD present',
  f08: 'fixture-08: reconciliation crash',
};

(async () => {
  const results = { generated_at: new Date().toISOString(), cells: {}, matrix: {} };
  for (const [implKey, impl] of Object.entries(IMPLS)) {
    const harness = require(impl.mod);
    results.matrix[implKey] = {};
    for (const [fxKey] of Object.entries(FIXTURES)) {
      let cell;
      try {
        cell = await harness.scenarios[fxKey]();
      } catch (e) {
        cell = { verdict: 'INCORRECT', evidence: [`HARNESS-ERROR ${e.message}`] };
      }
      if (!['CORRECT', 'INCORRECT', 'INAPPLICABLE'].includes(cell.verdict)) {
        cell = { verdict: 'INCORRECT', evidence: [`BAD-VERDICT ${cell.verdict}`] };
      }
      results.cells[`${implKey}x${fxKey}`] = {
        implementation: impl.label, fixture: FIXTURES[fxKey],
        verdict: cell.verdict, evidence: cell.evidence,
      };
      results.matrix[implKey][fxKey] = cell.verdict;
    }
  }
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2) + '\n');

  const sym = { CORRECT: 'C', INCORRECT: 'X', INAPPLICABLE: '-' };
  console.log('T-06 corpus verdict matrix (C=CORRECT, X=INCORRECT, -=INAPPLICABLE)');
  console.log('impl\\fixture | ' + Object.keys(FIXTURES).join(' | '));
  for (const [implKey] of Object.entries(IMPLS)) {
    console.log(implKey.padEnd(11) + ' | ' +
      Object.keys(FIXTURES).map(fx => sym[results.matrix[implKey][fx]].padEnd(3)).join(' | '));
  }
  const tally = {};
  for (const c of Object.values(results.cells)) tally[c.verdict] = (tally[c.verdict] || 0) + 1;
  console.log('tally:', JSON.stringify(tally), '| cells:', Object.keys(results.cells).length);
  console.log('wrote results.json');
})();
