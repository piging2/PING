#!/usr/bin/env node
// Connector lab test ladder. Per component (fixture), ten enforced gates:
//   EXISTS -> IMPORTS -> INITIALIZES -> REACHABLE -> EXECUTES -> PERSISTS
//   -> RECOVERS -> REPLAYS -> PRESERVES PROVENANCE -> FAILS SAFELY
// Nothing is COMPLETE at step 3. Exit 0 iff all ten gates pass.
//   node ladder.mjs <fixture.json> [--report <dir>]

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';

const RUNNER = join(dirname(process.argv[1]), 'run.mjs');

function gate(name, fn) {
  try {
    const r = fn();
    return { name, pass: !!r.pass, evidence: r.evidence || '' };
  } catch (e) {
    return { name, pass: false, evidence: `threw: ${e.message}` };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fixturePath = args.find(a => !a.startsWith('--'));
  if (!fixturePath) { console.error('usage: node ladder.mjs <fixture.json> [--report <dir>]'); process.exit(2); }
  const reportDir = (() => { const i = args.indexOf('--report'); return i >= 0 ? args[i + 1] : null; })();

  const results = [];
  let fixture = null;

  // 1. EXISTS
  results.push(gate('EXISTS', () => {
    if (!existsSync(fixturePath)) return { pass: false, evidence: 'file missing' };
    fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    if (fixture.format !== 'ping.ingest.fixture@1') return { pass: false, evidence: `bad format ${fixture.format}` };
    return { pass: true, evidence: `${fixture.fixtureId}@v${fixture.fixtureVersion} parses` };
  }));

  // 2. IMPORTS
  results.push(gate('IMPORTS', () => {
    return { pass: true, evidence: 'deferred to dynamic import below' };
  }));
  let mods = null;
  try {
    mods = {
      transport: await import('./transport.mjs'),
      harness: await import('./harness.mjs'),
      assert: await import('./assert.mjs'),
      taxonomy: await import('./taxonomy.mjs'),
      lint: await import('./lint.mjs'),
      scan: await import('./secret-scan.mjs'),
    };
    results[1] = { name: 'IMPORTS', pass: true, evidence: 'transport,harness,assert,taxonomy,lint,secret-scan import clean' };
  } catch (e) {
    results[1] = { name: 'IMPORTS', pass: false, evidence: `import threw: ${e.message}` };
  }

  // 3. INITIALIZES
  results.push(gate('INITIALIZES', () => {
    if (!mods) return { pass: false, evidence: 'imports failed' };
    const t = new mods.transport.ReplayTransport(fixture, {});
    const r = fixture.replay || {};
    if (r.deterministicClock !== true || !Number.isInteger(r.seed)) {
      return { pass: false, evidence: 'replay determinism controls missing' };
    }
    return { pass: true, evidence: `transport constructed; seed=${r.seed} clock=virtual` };
  }));

  // 4. REACHABLE
  results.push(gate('REACHABLE', () => {
    if (!mods) return { pass: false, evidence: 'imports failed' };
    if (fixture.connectorShape === 'webhook-push') {
      const t = new mods.transport.ReplayTransport(fixture, {});
      const ds = t.deliveries();
      return ds.length
        ? { pass: true, evidence: `${ds.length} deliveries reachable` }
        : { pass: false, evidence: 'no deliveries' };
    }
    const first = fixture.steps.find(s => s.kind === 'request');
    const t = new mods.transport.ReplayTransport(fixture, {});
    const r = t.request(first.request.method, first.request.path);
    return { pass: r.status !== undefined, evidence: `first step ${first.id} -> HTTP ${r.status}` };
  }));

  // 5. EXECUTES
  let cleanReport = null;
  try {
    const t = new mods.transport.ReplayTransport(fixture, {});
    cleanReport = fixture.connectorShape === 'webhook-push'
      ? await mods.harness.runWebhookPush(fixture, t)
      : await mods.harness.runPaginatedRead(fixture, t);
    const terminal = ['SUCCEEDED', 'FAILED', 'OUTCOME_UNKNOWN'].includes(cleanReport.terminalState);
    results.push({ name: 'EXECUTES', pass: terminal, evidence: `terminal=${cleanReport.terminalState} records=${cleanReport.recordsEmitted}` });
  } catch (e) {
    results.push({ name: 'EXECUTES', pass: false, evidence: `harness threw: ${e.message}` });
  }

  // 6. PERSISTS
  results.push(gate('PERSISTS', () => {
    const out = join(tmpdir(), `ladder-${Date.now()}.json`);
    const r = spawnSync('node', [RUNNER, fixturePath, '--report', out], { encoding: 'utf8' });
    if (!existsSync(out)) return { pass: false, evidence: `report not written (exit ${r.status})` };
    const saved = JSON.parse(readFileSync(out, 'utf8'));
    const ok = saved.verdict && saved.digestOk && saved.report;
    try { unlinkSync(out); } catch {}
    return { pass: !!ok, evidence: `report persisted; verdict=${saved.verdict} digestOk=${saved.digestOk}` };
  }));

  // 7. RECOVERS
  results.push(await (async () => {
    try {
      let injection;
      if (fixture.connectorShape === 'webhook-push') {
        injection = { reorderSeed: 7 };
      } else {
        const first = fixture.steps.find(s => s.kind === 'request');
        injection = { dropAt: [first.id] };
      }
      const t = new mods.transport.ReplayTransport(fixture, injection);
      const rep = fixture.connectorShape === 'webhook-push'
        ? await mods.harness.runWebhookPush(fixture, t)
        : await mods.harness.runPaginatedRead(fixture, t);
      const terminal = ['SUCCEEDED', 'FAILED', 'OUTCOME_UNKNOWN'].includes(rep.terminalState);
      return { name: 'RECOVERS', pass: terminal, evidence: `injection=${Object.keys(injection)} terminal=${rep.terminalState} codes=[${rep.failureCodes}]` };
    } catch (e) {
      return { name: 'RECOVERS', pass: false, evidence: `threw under injection: ${e.message}` };
    }
  })());

  // 8. REPLAYS
  results.push(await (async () => {
    try {
      const runOnce = async () => {
        const t = new mods.transport.ReplayTransport(fixture, {});
        return fixture.connectorShape === 'webhook-push'
          ? mods.harness.runWebhookPush(fixture, t)
          : mods.harness.runPaginatedRead(fixture, t);
      };
      const a = JSON.stringify(await runOnce());
      const b = JSON.stringify(await runOnce());
      return { name: 'REPLAYS', pass: a === b, evidence: a === b ? `double-run byte-identical (${a.length} bytes)` : 'run reports differ' };
    } catch (e) {
      return { name: 'REPLAYS', pass: false, evidence: `threw: ${e.message}` };
    }
  })());

  // 9. PRESERVES PROVENANCE
  results.push(gate('PRESERVES PROVENANCE', () => {
    const t = new mods.transport.ReplayTransport(fixture, {});
    const d = t.verifyDigest();
    const problems = [];
    if (!d.ok) problems.push('digest mismatch');
    if (!fixture.capture?.recordedBy) problems.push('capture.recordedBy missing');
    if (!fixture.sanitization?.status) problems.push('sanitization.status missing');
    const ids = (fixture.steps || []).map(s => s.id);
    if (new Set(ids).size !== ids.length || ids.some(i => !i)) problems.push('step ids not unique/present');
    if (basename(fixturePath).replace('.fixture.json', '') !== fixture.fixtureId) problems.push('filename/fixtureId mismatch');
    return { pass: problems.length === 0, evidence: problems.length ? problems.join('; ') : `digest ok ${String(d.computed).slice(0, 19)}...; provenance fields present` };
  }));

  // 10. FAILS SAFELY
  results.push(gate('FAILS SAFELY', () => {
    const tmp = join(tmpdir(), `ladder-tamper-${Date.now()}.json`);
    const tampered = JSON.parse(JSON.stringify(fixture));
    const s0 = tampered.steps.find(s => s.kind === 'request' || s.kind === 'webhook-delivery');
    if (s0.kind === 'request') s0.request.path += '?tampered=1';
    else s0.delivery.eventId += '-tampered';
    writeFileSync(tmp, JSON.stringify(tampered));
    const r1 = spawnSync('node', [RUNNER, tmp], { encoding: 'utf8' });
    let evidence = `tampered-bytes -> exit ${r1.status} (want 2, digest fail-closed)`;
    let ok = r1.status === 2;
    const reqSteps = (fixture.steps || []).filter(s => s.kind === 'request').map(s => s.id);
    if (ok && reqSteps.length) {
      const r2 = spawnSync('node', [RUNNER, fixturePath, '--inject',
        JSON.stringify({ errorAt: reqSteps, errorStatus: 500 })], { encoding: 'utf8' });
      ok = r2.status === 1; // FAIL verdict, not a crash, not a silent pass
      evidence += `; all-steps-500 -> exit ${r2.status} (want 1, failed fetch with failure record, never silent)`;
    }
    try { writeFileSync(tmp, ''); } catch {}
    return { pass: ok, evidence };
  }));

  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ladder/${r.name}  ${r.evidence}`);
    if (!r.pass) allPass = false;
  }
  console.log(`${allPass ? 'LADDER-PASS' : 'LADDER-FAIL'}  ${fixture ? fixture.fixtureId : fixturePath}`);

  if (reportDir) {
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, `${fixture ? fixture.fixtureId : 'unknown'}.ladder.json`),
      JSON.stringify({ fixture: fixture?.fixtureId, pass: allPass, gates: results }, null, 2) + '\n');
  }
  process.exit(allPass ? 0 : 1);
}

main();
