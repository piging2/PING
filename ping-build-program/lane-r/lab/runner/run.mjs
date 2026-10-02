#!/usr/bin/env node
// Connector lab fixture runner.
//   node run.mjs <fixture.json> [--inject '<json>'] [--pin-digest] [--report <out.json>]
//            [--scan-secrets [--canary <value>]] [--lint]
// Exit 0 on PASS, 1 on FAIL, 2 on runner error. No network, no wall-clock.
//
// Gates, in order: lint (optional) -> secret scan (optional) -> digest
// verify -> replay -> expect assertions -> LAB INVARIANTS (unconditional).

import { readFileSync, writeFileSync } from 'node:fs';
import { ReplayTransport } from './transport.mjs';
import { runPaginatedRead, runWebhookPush } from './harness.mjs';
import { assertReport, checkInvariants } from './assert.mjs';
import { lintFixture } from './lint.mjs';
import { findSecrets } from './secret-scan.mjs';

function usage() {
  console.error('usage: node run.mjs <fixture.json> [--inject \'<json>\'] [--pin-digest] [--report <out.json>] [--scan-secrets [--canary <v>]] [--lint]');
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  const fixturePath = args.find(a => !a.startsWith('--'));
  if (!fixturePath) usage();
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };

  let fixture;
  try {
    fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  } catch (e) {
    console.error(`runner error: cannot read fixture: ${e.message}`);
    process.exit(2);
  }
  if (fixture.format !== 'ping.ingest.fixture@1') {
    console.error(`runner error: unsupported fixture format ${fixture.format}`);
    process.exit(2);
  }

  if (args.includes('--lint')) {
    const lint = lintFixture(fixture, fixturePath);
    if (!lint.pass) {
      console.error(`runner error: fixture lint rejected ${fixturePath}`);
      for (const v of lint.violations) console.error(`  - ${v}`);
      process.exit(2);
    }
  }

  if (args.includes('--scan-secrets')) {
    const canary = get('--canary');
    const hits = findSecrets(fixture, canary);
    if (hits.length > 0) {
      console.error(`runner error: secret scan rejected ${fixturePath} (${hits.length} hits)`);
      for (const h of hits) console.error(`  - [${h.label}] near "${h.near}": ${h.sample}`);
      process.exit(2);
    }
  }

  let injection = {};
  const injectRaw = get('--inject');
  if (injectRaw) {
    try { injection = JSON.parse(injectRaw); }
    catch { console.error('runner error: --inject must be valid JSON'); process.exit(2); }
  }

  const transport = new ReplayTransport(fixture, injection);
  const digest = transport.verifyDigest();
  if (args.includes('--pin-digest')) {
    const pinned = transport.pinDigest();
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n');
    console.log(`digest pinned: ${pinned}`);
  } else if (!digest.ok) {
    console.error(`runner error: fixture digest mismatch\n  recorded: ${digest.recorded}\n  computed: ${digest.computed}`);
    process.exit(2);
  }

  let report;
  try {
    if (fixture.connectorShape === 'webhook-push') report = await runWebhookPush(fixture, transport);
    else report = await runPaginatedRead(fixture, transport);
  } catch (e) {
    console.error(`runner error: harness threw: ${e.message}`);
    process.exit(2);
  }

  const verdict = assertReport(fixture.expect, report);
  // Lab invariants hold regardless of what expect declares.
  const invariantViolations = checkInvariants(report);
  const failures = [...verdict.failures, ...invariantViolations.map(v => `INVARIANT ${v}`)];
  const out = {
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    digestOk: digest.ok,
    injection: Object.keys(injection).length ? injection : undefined,
    report,
  };
  const reportPath = get('--report');
  if (reportPath) writeFileSync(reportPath, JSON.stringify(out, null, 2) + '\n');

  console.log(`${out.verdict}  ${fixture.fixtureId}@v${fixture.fixtureVersion}` +
    (Object.keys(injection).length ? `  [inject: ${Object.keys(injection).join(',')}]` : ''));
  for (const f of failures) console.log(`  - ${f}`);
  console.log(`  records=${report.recordsEmitted} dupes_absorbed=${report.duplicatesAbsorbed} ` +
    `quarantined=${report.quarantined} terminal=${report.terminalState} ` +
    `codes=[${report.failureCodes.join(',')}] virtualMs=${report.virtualMs}`);
  process.exit(out.verdict === 'PASS' ? 0 : 1);
}

main();
