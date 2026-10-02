#!/usr/bin/env node
// Red-team the lab itself. Four adversarial cases; each must be CAUGHT:
//   1. secret-leak: fixture embeds a live secret + the capture canary
//      -> secret-scan must REJECT (and run.mjs --scan-secrets refuses it).
//   2. duplicate-write-hiding: tampered harness double-emits; a permissive
//      expect block PASSES (the hiding) -> lab invariants must still FAIL it.
//   3. nondeterministic: wall-clock latency, no seed -> lint must REJECT.
//   4. drift: live sample no longer matches recordSchema -> drift-check must
//      DETECT and classify SCHEMA_CHANGED.
//   5. pagination-loop: provider nextPath loops -> harness must fail closed
//      (exit 2), never hang.
// Exit 0 iff every attack is caught. Each case prints CAUGHT/MISSED.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const HERE = dirname(process.argv[1]);
const RUNNER = join(HERE, '..', 'runner', 'run.mjs');
const node = (args) => spawnSync('node', args, { encoding: 'utf8' });

const cases = [];
const caught = (name, ok, evidence) => {
  cases.push({ name, caught: ok, evidence });
  console.log(`${ok ? 'CAUGHT' : 'MISSED'}  redteam/${name}  ${evidence}`);
};

// Case 1: secret leak.
{
  const scan = node([join(HERE, '..', 'runner', 'secret-scan.mjs'),
    join(HERE, 'secret-leak.fixture.json'), '--canary', 'CANARY_LANE_R_9f8e7d6c5b4a']);
  const refused = node([RUNNER, join(HERE, 'secret-leak.fixture.json'),
    '--scan-secrets', '--canary', 'CANARY_LANE_R_9f8e7d6c5b4a']);
  const ok = scan.status === 1 && refused.status === 2;
  caught('secret-leak', ok,
    `scan exit=${scan.status} (want 1); run --scan-secrets exit=${refused.status} (want 2)`);
}

// Case 2: duplicate-write hiding.
{
  const { ReplayTransport } = await import('../runner/transport.mjs');
  const { assertReport, checkInvariants } = await import('../runner/assert.mjs');
  const { runWebhookPushTampered } = await import('./harness-tampered.mjs');
  const fixture = JSON.parse(readFileSync(
    join(HERE, '..', 'fixtures', 'webhook-duplicate-delivery.fixture.json'), 'utf8'));
  const transport = new ReplayTransport(fixture, {});
  const report = await runWebhookPushTampered(fixture, transport);
  // Permissive expect: what a sloppy fixture author would write.
  const permissive = assertReport({ terminalState: 'SUCCEEDED' }, report);
  const invariants = checkInvariants(report);
  const ok = permissive.pass === true && invariants.length > 0;
  caught('duplicate-write-hiding', ok,
    `permissive expect ${permissive.pass ? 'PASSED (the hiding)' : 'failed'}; ` +
    `invariants: ${invariants.length ? 'VIOLATED -> ' + invariants[0] : 'none (MISSED!)'}`);
}

// Case 3: nondeterministic fixture.
{
  const { lintFixture } = await import('../runner/lint.mjs');
  const fixture = JSON.parse(readFileSync(join(HERE, 'nondeterministic.fixture.json'), 'utf8'));
  const lint = lintFixture(fixture, 'nondeterministic.fixture.json');
  const ok = !lint.pass && lint.violations.length >= 3;
  caught('nondeterministic', ok,
    `lint ${lint.pass ? 'passed (MISSED!)' : `rejected with ${lint.violations.length} violations`}`);
}

// Case 4: fixture drift.
{
  const drift = node([join(HERE, 'drift-check.mjs'),
    join(HERE, '..', 'fixtures', 'schema-drift-quarantine.fixture.json'),
    join(HERE, 'live-sample-drifted.json')]);
  const ok = drift.status === 1 && /SCHEMA_CHANGED/.test(drift.stdout);
  caught('fixture-drift', ok,
    `drift-check exit=${drift.status} (want 1); classification=${/SCHEMA_CHANGED/.test(drift.stdout) ? 'SCHEMA_CHANGED' : 'none'}`);
}

// Case 5: pagination loop fails closed.
{
  const loop = node([RUNNER, join(HERE, 'pagination-loop.fixture.json'), '--pin-digest'],
    { encoding: 'utf8', timeout: 15000 });
  // pin first so the digest gate does not mask the loop test; then run.
  const run = node([RUNNER, join(HERE, 'pagination-loop.fixture.json')], { encoding: 'utf8', timeout: 15000 });
  const ok = run.status === 2 && /pagination loop/.test(run.stderr + run.stdout);
  caught('pagination-loop', ok,
    `run exit=${run.status} (want 2, fail-closed); loop guard=${/pagination loop/.test(run.stderr + run.stdout) ? 'tripped' : 'not seen'}`);
}

const allCaught = cases.every(c => c.caught);
console.log(`${allCaught ? 'REDTEAM-ALL-CAUGHT' : 'REDTEAM-MISSED'}  ${cases.filter(c => c.caught).length}/${cases.length} attacks caught`);
writeFileSync(join(HERE, 'redteam-results.json'), JSON.stringify({ allCaught, cases }, null, 2) + '\n');
process.exit(allCaught ? 0 : 1);
