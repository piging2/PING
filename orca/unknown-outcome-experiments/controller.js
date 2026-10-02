// controller.js — ORCA A6 witnessed-crash proof orchestrator.
// Spawns workers, sends REAL SIGKILL at target markers (<=5ms rendezvous polling),
// runs fresh-process restart reconciliation, records one JSONL line per kill point,
// then runs the extended chaos suite and the final assertion.
//
// usage: node controller.js
// All state lives in the experiment dir. Test DB via db.js (env mechanism only).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { mark, sleep, post, get, waitMarker, waitMarkerNth, readNew } = require('./lib');
const api = require('./effect-api');
require('./db').applyEnv();

const DIR = __dirname;
const STUB_PORT = 18311;
const STUB_BASE = 'http://127.0.0.1:' + STUB_PORT;
const RESULTS = path.join(DIR, 'kill-matrix-results.jsonl');
const CHAOS_RESULTS = path.join(DIR, 'chaos-results.jsonl');
const RUN_ID = 'a6-' + Date.now().toString(36);

let stubProc = null;
let seq = 0;

function nid(prefix) { seq += 1; return `${prefix}-${RUN_ID}-${seq}`; }

async function startStub() {
  const logFile = path.join(DIR, 'stub-commit-log.jsonl');
  try { fs.unlinkSync(logFile); } catch (e) {}
  stubProc = spawn('node', [path.join(DIR, 'stub-provider.js'), String(STUB_PORT), logFile],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('stub start timeout')), 15000);
    stubProc.stdout.on('data', (d) => { if (String(d).includes('"stub":"up"')) { clearTimeout(t); resolve(); } });
    stubProc.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
    stubProc.on('exit', (c) => { clearTimeout(t); reject(new Error('stub exited ' + c)); });
  });
}

function stopStub() { if (stubProc) { try { stubProc.kill('SIGKILL'); } catch (e) {} } }

async function stubLog(opKey) {
  const r = await get(STUB_BASE, '/log');
  return (r.body.entries || []).find(e => e.opKey === opKey) || null;
}
async function stubQuery(opKey) {
  const r = await get(STUB_BASE, '/query?opKey=' + encodeURIComponent(opKey));
  return r.body;
}
async function stubEffectCount(opKey) {
  const e = await stubLog(opKey);
  return e ? e.count : 0;
}
// True executed count from the append-only commit log file (survives amnesia tombstones).
function trueEffectCount(opKey) {
  const logFile = path.join(DIR, 'stub-commit-log.jsonl');
  let n = 0;
  try {
    for (const line of fs.readFileSync(logFile, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      if (e.opKey === opKey && e.event === 'effect_executed') n += 1;
    }
  } catch (e) {}
  return n;
}

function runWorker(workerCfg) {
  const rendezvous = path.join(DIR, `rendezvous-${workerCfg.point || workerCfg.tag}-${Date.now()}.jsonl`);
  fs.writeFileSync(rendezvous, '');
  const proc = spawn('node', [path.join(DIR, 'worker.js'), JSON.stringify({ ...workerCfg, stubBase: STUB_BASE, rendezvous })],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr.on('data', (d) => process.stderr.write('[worker] ' + d));
  return { proc, rendezvous, pid: proc.pid };
}

// Spawn a restart WITHOUT waiting: returns immediately with the child,
// rendezvous path, and a completion promise. Required for points 11/12
// (kill the restart mid-reconciliation / mid-sweep).
function spawnRestart(restartCfg) {
  const rendezvous = path.join(DIR, `rendezvous-restart-${Date.now()}-${Math.floor(Math.random() * 1e6)}.jsonl`);
  fs.writeFileSync(rendezvous, '');
  const proc = spawn('node', [path.join(DIR, 'reconcile-restart.js'), JSON.stringify({ ...restartCfg, stubBase: STUB_BASE, rendezvous })],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => process.stderr.write('[restart] ' + d));
  const done = new Promise((resolve) => proc.on('exit', (code, signal) => resolve({ code, signal })));
  const completion = done.then(() => {
    let result = null;
    try { result = JSON.parse(out.trim().split('\n').pop()); } catch (e) { result = { parseError: out.slice(0, 500) }; }
    return { rendezvous, result };
  });
  return { proc, rendezvous, done, completion };
}

async function runRestart(restartCfg) {
  const s = spawnRestart(restartCfg);
  const exit = await s.done;
  const { result } = await s.completion;
  return { proc: s.proc, rendezvous: s.rendezvous, code: exit.code, result };
}

// Real OS kill at the target marker. Returns measured timing evidence.
// beforeKill: optional async hook run after the marker is seen, before SIGKILL
// (e.g. wait until the stub log shows accepted).
// occurrence: 1-based occurrence of the marker to kill at (default 1).
async function killAt({ proc, rendezvous, marker, delayMs = 0, extraWaitMs = 0, releaseAfter = null, beforeKill = null, occurrence = 1 }) {
  const m = occurrence > 1
    ? await waitMarkerNth(rendezvous, marker, occurrence, 30000, 5)
    : await waitMarker(rendezvous, marker, 30000, 5);
  if (!m) throw new Error('target marker never observed: ' + marker + ' (occurrence ' + occurrence + ')');
  if (beforeKill) await beforeKill(m);
  if (delayMs > 0) await sleep(delayMs);
  const killTs = Date.now();
  proc.kill('SIGKILL'); // real kill -9, never a simulated exception
  const exit = await new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timeout: true }), 10000);
    proc.on('exit', (code, signal) => { clearTimeout(t); resolve({ code, signal }); });
  });
  if (extraWaitMs > 0) await sleep(extraWaitMs);
  if (releaseAfter) {
    for (const rel of releaseAfter) {
      try { await post(STUB_BASE, '/release', rel); } catch (e) {}
    }
  }
  return { markerTs: m.ts, killTs, latencyMs: killTs - m.ts, exit, markerSeen: m.marker };
}

async function waitForMarkerOrTimeout(rendezvous, marker, timeoutMs) {
  return waitMarker(rendezvous, marker, timeoutMs, 5);
}

function baseCtx(tag) {
  const missionId = nid('mission');
  return {
    tag,
    missionId,
    workOrderId: nid('wo'),
    attemptId: nid('attempt'),
    logicalOpId: nid('lop'),
    effect: 'a6probe:A6_PROBE',
    input: { probe: tag, n: 7, nested: { a: [1, 2] } },
  };
}

function record(file, obj) {
  fs.appendFileSync(file, JSON.stringify({ run_id: RUN_ID, recorded_at: Date.now(), ...obj }) + '\n');
}

async function ledgerEvidence(opKey) {
  // Real durable evidence: ledger row + EFFECT_* event history + operation state.
  let stack = null;
  try {
    stack = await api.makeStack({});
    const row = await api.ledgerRow(stack, opKey);
    const history = await api.eventHistory(stack, opKey);
    const state = await api.operationState(stack, opKey);
    return {
      ledger_row: row ? { op_key: row.op_key, mission_id: row.mission_id, effect: row.effect, has_result: row.result != null, consequence: row.consequence } : null,
      event_types: history.map(e => e.event_type),
      operation_state: state ? { current_state: state.current_state, reconciliation_state: state.reconciliation_state, retry_eligible: state.retry_eligible, attempt: state.attempt } : null,
    };
  } catch (e) {
    return { ledgerEvidenceError: String(e && e.message || e) };
  } finally {
    if (stack) await api.endStack(stack);
  }
}

// ---- one kill-point scenario ----
async function killPoint(n, def) {
  const ctx = baseCtx('p' + n);
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = runWorker({ point: 'p' + n, ...ctx, ...def.workerCfg });
  let kill = null, restart = null, note = '';
  try {
    if (def.noKill) {
      // Point 10: let the worker complete; the kill is a semantic no-op.
      const done = await waitForMarkerOrTimeout(w.rendezvous, 'WORKER_COMPLETE', 30000);
      note = done ? 'worker completed before kill window; kill is a semantic no-op' : 'WORKER DID NOT COMPLETE';
      kill = { markerSeen: 'WORKER_COMPLETE', latencyMs: null, exit: { code: 0, signal: null }, noop: true };
    } else if (def.killMarker === 'PRE_DISPATCH_WAIT') {
      const m = await waitMarker(w.rendezvous, 'PRE_DISPATCH_WAIT', 30000, 5);
      if (!m) throw new Error('PRE_DISPATCH_WAIT never observed');
      await sleep(def.delayMs || 300);
      const killTs = Date.now();
      w.proc.kill('SIGKILL');
      const exit = await new Promise((resolve) => {
        const t = setTimeout(() => resolve({ timeout: true }), 10000);
        w.proc.on('exit', (code, signal) => { clearTimeout(t); resolve({ code, signal }); });
      });
      kill = { markerTs: m.ts, killTs, latencyMs: killTs - m.ts, exit, markerSeen: 'PRE_DISPATCH_WAIT' };
    } else {
      kill = await killAt({ proc: w.proc, rendezvous: w.rendezvous, marker: def.killMarker, delayMs: def.delayMs || 0, releaseAfter: def.releaseAfter, beforeKill: def.beforeKill ? ((m) => def.beforeKill(w, opKey)) : null, occurrence: def.killOccurrence || 1 });
    }
    // Release any stub holds so the restart phase is not wedged (unless the def says otherwise).
    if (def.releaseHolds !== false) {
      for (const hname of ['dispatch', 'receipt', 'query']) {
        try { await post(STUB_BASE, '/release', { opKey, name: hname }); } catch (e) {}
      }
    }
    restart = await runRestart({ ...ctx, ...(def.restartCfg || {}), runSweep: true });
  } finally {
    try { w.proc.kill('SIGKILL'); } catch (e) {}
  }

  const rec = {
    kill_point: n,
    mission_id: ctx.missionId, run_id: RUN_ID, work_order_id: ctx.workOrderId,
    attempt_id: ctx.attemptId, logical_operation_id: ctx.logicalOpId,
    idempotency_key: opKey,
    dispatch_state: await stubLog(opKey),
    effect_evidence: { stub_query: await stubQuery(opKey), effect_count: await stubEffectCount(opKey), true_effect_count: trueEffectCount(opKey) },
    durable_evidence: await ledgerEvidence(opKey),
    reconciliation_state: restart ? restart.result : null,
    retry_eligibility: restart && restart.result ? restart.result.reconcile : null,
    kill_evidence: kill,
    note,
    expectation: def.expectation,
  };
  rec.final_result = summarize(rec);
  record(RESULTS, rec);
  console.log(`POINT ${n}: ${rec.final_result} | effect_count=${rec.effect_evidence.true_effect_count} | kill_latency=${kill && kill.latencyMs}ms`);
  return rec;
}

function summarize(rec) {
  const r = rec.reconciliation_state;
  if (!r || !r.ok) return 'RESTART_FAILED';
  const d = r.reconcile || {};
  const st = r.operation_state || {};
  return `resolution=${d.resolution} via=${d.via || ''} state=${st.current_state || ''} retry_eligible=${st.retry_eligible && st.retry_eligible.eligible}`;
}

module.exports = { startStub, stopStub, runWorker, runRestart, spawnRestart, killAt, waitForMarkerOrTimeout, baseCtx, record, stubLog, stubQuery, stubEffectCount, trueEffectCount, ledgerEvidence, killPoint, summarize, STUB_BASE, DIR, RESULTS, CHAOS_RESULTS, RUN_ID };
