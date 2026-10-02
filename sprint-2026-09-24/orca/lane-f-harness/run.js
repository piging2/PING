'use strict';
/**
 * Lane F integration harness runner (design §4 case list).
 *
 * Usage: node run.js [--only <case>] [--out <dir>]
 *
 * Deterministic case order. Fresh output root per run. Writes run-summary.json
 * and exits non-zero if any case FAILS. Each case receives:
 *   { outRoot, missionId(caseName) -> mission_id, readCaseEvents(caseName),
 *     caseDir(caseName) -> bundle dir }
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CASES = [
  'happy-path',
  'unknown-ambiguous',
  'no-match',
  'failed-before-effect',
  'timeout-unknown',
  'duplicate-effect-regression',
  'concurrency-ab',
  'identity-denials',
  'refresh-replay',
];

function missionIdFor(caseName) {
  return 'lane-f-' + crypto.createHash('sha256').update('lane-f:' + caseName).digest('hex').slice(0, 16);
}

async function main() {
  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  const outIdx = args.indexOf('--out');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;
  const root = path.resolve(__dirname, 'out');
  const runId = `run-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}-${crypto.randomBytes(2).toString('hex')}`;
  const outRoot = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(root, runId);
  fs.mkdirSync(outRoot, { recursive: true });

  const selected = CASES.filter((c) => !only || only.includes(c));
  const results = [];
  for (const name of selected) {
    const mod = require(path.join(__dirname, 'cases', name + '.js'));
    const caseDir = (cn) => path.join(outRoot, cn, missionIdFor(cn));
    const ctx = {
      outRoot,
      missionId: missionIdFor,
      caseDir,
      readCaseEvents(cn) {
        const p = path.join(caseDir(cn), 'events.jsonl');
        if (!fs.existsSync(p)) return [];
        return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
      },
    };
    const t0 = Date.now();
    try {
      const verdict = await mod.run(ctx);
      results.push({ case: name, ...verdict, ms: Date.now() - t0 });
    } catch (err) {
      results.push({ case: name, verdict: 'FAIL', error: String(err && err.stack || err).slice(0, 3000), ms: Date.now() - t0 });
    }
    process.stdout.write(`[${name}] ${results[results.length - 1].verdict} (${results[results.length - 1].ms}ms)\n`);
  }

  const failed = results.filter((r) => r.verdict !== 'PASS');
  const summary = {
    harness: 'lane-f-integration',
    run_id: runId,
    run_at: new Date().toISOString(),
    cases: results,
    failed: failed.map((r) => r.case),
  };
  fs.writeFileSync(path.join(outRoot, 'run-summary.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(`\n${results.length - failed.length}/${results.length} PASS -> ${outRoot}\n`);
  if (failed.length) { process.stdout.write('FAILED: ' + failed.map((r) => r.case).join(', ') + '\n'); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(2); });
