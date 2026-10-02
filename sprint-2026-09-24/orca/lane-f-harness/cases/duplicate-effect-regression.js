'use strict';
/**
 * Lane F case: duplicate-effect regression (design 1F).
 *
 * Folds the existing WR-lane artifacts into the harness as a permanent
 * regression case rather than a one-off proof:
 *   - repro-effect-then-undefined.js (verbatim known-bad code): the harness
 *     runs it in --expect-fail-on-known-bad mode and asserts the duplicate
 *     IS observed (proves the harness detects the defect).
 *   - regression-failclosed.js (repaired code): asserts 45/45 and the
 *     exactly-once invariant (PASS iff effects == 1).
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { Bundle } = require('../lib/evidence');

const WR_DIR = '/home/hatch/workspace/sprint-2026-09-24/orca/wr-effect-unknown';

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', timeout: 120000, cwd: WR_DIR, maxBuffer: 8 * 1024 * 1024,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: (r.stderr || '').slice(0, 2000), error: r.error ? String(r.error) : null };
}

async function run(ctx) {
  const caseName = 'duplicate-effect-regression';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);

  // --- Negative control: known-bad verbatim code must reproduce the duplicate ---
  const repro = runNode(path.join(WR_DIR, 'repro-effect-then-undefined.js'));
  bundle.writeText('negative-control-repro-stdout.txt', repro.stdout);
  bundle.writeText('negative-control-repro-stderr.txt', repro.stderr);
  const duplicateObserved = /duplicate/i.test(repro.stdout) || /effects?\s*(==|[:=])\s*2/i.test(repro.stdout);
  bundle.write('negative-control.json', {
    mode: 'expect-fail-on-known-bad',
    script: 'repro-effect-then-undefined.js (verbatim pre-fix copies)',
    exit: repro.status,
    duplicate_observed: duplicateObserved,
    note: 'exit 0 with duplicate observed = the defect reproduces on known-bad code, proving this case detects it',
  });
  bundle.check('negative control: known-bad code reproduces the duplicate effect', duplicateObserved,
    { exit: repro.status, stdout_tail: repro.stdout.slice(-400) });

  // --- Repaired code: the permanent regression, 45/45 ---
  const reg = runNode(path.join(WR_DIR, 'regression-failclosed.js'));
  bundle.writeText('regression-stdout.txt', reg.stdout);
  bundle.writeText('regression-stderr.txt', reg.stderr);
  const passCount = (reg.stdout.match(/^ok: /gm) || []).length;
  const failCount = (reg.stdout.match(/^FAIL: /gm) || []).length;
  bundle.write('regression-summary.json', {
    script: 'regression-failclosed.js (verbatim repaired patch copies)',
    exit: reg.status, assertions_passed: passCount, assertions_failed: failCount,
  });
  bundle.check('regression exits 0 on repaired code', reg.status === 0, { exit: reg.status });
  bundle.check('regression: 45/45 assertions pass', passCount === 45 && failCount === 0, { passCount, failCount });

  // --- Invariant: exactly 1 physical effect for 1 logical mission ---
  // The regression's case-1 provider file is the evidence; re-derive the count.
  const regProvider = path.join(WR_DIR, 'regression-provider-case1.jsonl');
  let effects = null;
  if (fs.existsSync(regProvider)) {
    effects = fs.readFileSync(regProvider, 'utf8').trim().split('\n').filter(Boolean).length;
  }
  bundle.write('effect-count.json', { effects, provider_file: 'regression-provider-case1.jsonl' });
  bundle.check('exactly-once invariant: effects == 1', effects === 1, { effects });

  // --- Evidence chain: outcome record + receipt + effect linked by op key ---
  let evidence = null;
  const evPath = path.join(WR_DIR, 'regression-evidence.json');
  if (fs.existsSync(evPath)) {
    evidence = JSON.parse(fs.readFileSync(evPath, 'utf8'));
    bundle.write('lane-a-regression-evidence.json', evidence);
  }
  bundle.check('lane-A regression evidence bundle captured', !!evidence);

  return bundle.verdict({ case_file: 'duplicate-effect-regression.js' });
}

module.exports = { run };
