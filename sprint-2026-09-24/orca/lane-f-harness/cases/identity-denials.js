'use strict';
/**
 * Lane F case: identity-denials (Nolan's standing authorization: identities
 * 1–4 only; 5–10 DENIED).
 *
 * Three layers, all zero-spend, zero-effect:
 *   1. Live :3100 dispatch catalog (GET): offered agents must be exactly
 *      ollama + identity_1..4 — identity_5..10 absent.
 *   2. Live :3100 dispatch (POST) as identity_5..10: 403 agent_denied, mission
 *      state DENIED (never FAILED), no run/execution, no journal lifecycle
 *      beyond the denial audit event.
 *   3. Broker-level: broker.dispatch(task) with identity_6..10 is denied
 *      (identity_5 covered by the Step-0 suite; 6–10 asserted here).
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { Bundle } = require('../lib/evidence');

const PIG_SSH = ['ssh', '-F', '/home/hatch/.ssh/pig-config', 'pigwsl'];

function pigCurl(method, url, body) {
  // Marker-based split: avoids embedding newlines in the -w arg, which the
  // WSL stdin chain mangles. curl appends [[CODE:<http_code>]] to the body.
  const args = ['-s', '-w', "'[[CODE:%{http_code}]]'", '-X', method, `'${url}'`];
  if (body) args.push('-H', `'Content-Type: application/json'`, '-d', `'${JSON.stringify(body)}'`);
  const script = `curl ${args.join(' ')}\n`;
  const r = spawnSync('ssh', [...PIG_SSH.slice(1), 'wsl', '--', 'bash', '-s'], {
    input: script, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024,
  });
  if (r.error) throw new Error('pig curl failed: ' + String(r.error));
  const out = (r.stdout || '');
  const mcode = out.match(/\[\[CODE:(\d{3})\]\]\s*$/);
  const code = mcode ? parseInt(mcode[1], 10) : NaN;
  const bodyText = mcode ? out.slice(0, mcode.index) : out;
  return { code, body: bodyText };
}

function pigJournalGrep(fixed) {
  const script = `grep -F '${fixed}' /home/nolan/workspace/fyd-journal-gateway/events.jsonl\n`;
  const r = spawnSync('ssh', [...PIG_SSH.slice(1), 'wsl', '--', 'bash', '-s'], {
    input: script, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  });
  return r.stdout || '';
}

async function run(ctx) {
  const caseName = 'identity-denials';
  const missionId = ctx.missionId(caseName);
  const bundle = new Bundle(ctx.outRoot, caseName, missionId);
  const results = {};

  // --- Layer 1: the live catalog offers exactly ollama + identity_1..4 ---
  let catalog = null;
  try {
    const res = pigCurl('GET', 'http://127.0.0.1:3100/api/mc/dispatch');
    results.catalog_http = res.code;
    catalog = JSON.parse(res.body);
  } catch (e) {
    results.catalog_error = String(e).slice(0, 200);
  }
  const offered = catalog && catalog.agents ? catalog.agents.map((a) => a.id) : null;
  bundle.write('catalog.json', { http: results.catalog_http, agents: offered });
  bundle.check('catalog reachable (HTTP 200)', results.catalog_http === 200, { http: results.catalog_http });
  bundle.check('catalog offers identity_1..4', !!offered && ['identity_1', 'identity_2', 'identity_3', 'identity_4'].every((id) => offered.includes(id)), { offered });
  bundle.check('catalog offers ollama', !!offered && offered.includes('ollama'), { offered });
  const deniedIds = ['identity_5', 'identity_6', 'identity_7', 'identity_8', 'identity_9', 'identity_10'];
  const leaked = offered ? deniedIds.filter((id) => offered.includes(id)) : null;
  bundle.check('identity_5..10 absent from the offered catalog', !!offered && leaked.length === 0, { leaked, offered });

  // --- Layer 2: POST as identity_5..10 -> 403 agent_denied, zero effects ---
  const denials = [];
  if (results.catalog_http === 200) {
    for (const id of deniedIds) {
      const res = pigCurl('POST', 'http://127.0.0.1:3100/api/mc/dispatch', {
        prompt: 'lane-f identity denial probe (no-op)',
        agent: id, capability: 'text.summarize', tenant: 'happy-place',
      });
      let parsed = null;
      try { parsed = JSON.parse(res.body); } catch (_) { /* non-JSON */ }
      denials.push({ identity: id, http: res.code, error: parsed && parsed.error, status: parsed && parsed.status, mission_id: parsed && parsed.mission_id });
      // Zero effects: no lifecycle events beyond the denial audit for this mission.
      const mid = parsed && parsed.mission_id;
      const lines = mid ? pigJournalGrep(mid).trim().split('\n').filter(Boolean) : [];
      const types = lines.map((l) => { try { return JSON.parse(l).event_type; } catch (_) { return '?'; } });
      const nonDenial = types.filter((t) => !['MC_AGENT_DENIED'].includes(t));
      denials[denials.length - 1].journal_event_types = types;
      bundle.check(`${id}: HTTP 403 agent_denied`, res.code === 403 && parsed && parsed.error === 'agent_denied',
        { http: res.code, error: parsed && parsed.error });
      // Early validation denies before any mission is minted: no mission_id,
      // no journal events, no run/execution. Zero effects by construction.
      bundle.check(`${id}: denied at validation (no mission minted, never FAILED)`,
        parsed && (parsed.mission_id === undefined || parsed.mission_id === null) && !parsed.status,
        { mission_id: parsed && parsed.mission_id, status: parsed && parsed.status });
      bundle.check(`${id}: zero execution effects (no lifecycle beyond denial audit)`, nonDenial.length === 0, { types });
    }
  } else {
    bundle.write('denials-skipped.json', { reason: 'catalog unreachable; live POST probes skipped' });
  }
  bundle.write('denials.json', denials);
  results.live_denials = denials.length;

  // --- Layer 3: broker-level denial for identity_6..10 (5 covered in Step-0) ---
  const { mkdtempSync } = require('fs');
  const { tmpdir } = require('os');
  const { join } = require('path');
  const brokerMod = await import('/home/hatch/workspace/pig-fb/copilot-broker/src/broker.js');
  const identityMod = await import('/home/hatch/workspace/pig-fb/copilot-broker/src/identity-state.js');
  const quotaMod = await import('/home/hatch/workspace/pig-fb/copilot-broker/src/quota-model.js');
  const brokerDenials = [];
  for (const id of ['identity_6', 'identity_7', 'identity_8', 'identity_9', 'identity_10']) {
    const dir = mkdtempSync(join(tmpdir(), 'lanef-broker-'));
    const store = identityMod.loadStore(join(dir, 'identities.json'));
    const id1 = identityMod.markAuthorized(identityMod.createIdentity('identity_1'));
    quotaMod.applyQuotaSnapshot(id1, { remaining: 5000, resetAt: '2026-10-01T00:00:00.000Z' });
    store.put(id1);
    const calls = [];
    const broker = brokerMod.createBroker({
      store,
      runner: async (opts) => { calls.push(opts); return { classification: 'SUCCESS', result_text: 'done' }; },
      clock: () => new Date('2026-09-26T12:00:00.000Z'),
    });
    let out = null; let threw = null;
    try {
      out = await broker.dispatch({ tier: 'T2', identity_id: id, prompt: 'lane-f probe (no-op)', workdir: dir, tenant_id: 'happy-place' });
    } catch (e) { threw = String((e && e.message) || e).slice(0, 200); }
    const denied = out ? (out.route === 'blocked' && out.invoked_copilot === false && calls.length === 0) : threw !== null;
    brokerDenials.push({ identity: id, denied, route: out && out.route, runner_calls: calls.length, threw });
    bundle.check(`broker denies ${id} (zero spend, runner never invoked)`, denied === true,
      { route: out && out.route, runner_calls: calls.length, threw });
  }
  bundle.write('broker-denials.json', brokerDenials);

  return bundle.verdict({ case_file: 'identity-denials.js', live_probes: results.live_denials });
}

module.exports = { run };
