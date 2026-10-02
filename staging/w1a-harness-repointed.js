#!/usr/bin/env node
/*
 * W-1A invariant / failure tests (restore-trigger unit).
 *
 * Run against the UNMODIFIED tree first (expect FAIL), then against the fixed
 * tree (expect PASS). Isolated scratch PG only (127.0.0.1:15439). NEVER touches
 * shared ping-postgres or any live container.
 *
 * Usage (on the Pig): node w1a-invariant-harness.js
 * Exit 0 = all pass; exit 1 = any fail.
 */

const R = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { WitnessWorker } = require(R + '/ping-runtime/workers/canonical_workers.js');
const { WorkerRuntime } = require(R + '/ping-runtime/workers/worker_runtime.js');
const { MissionScheduler } = require(R + '/ping-runtime/orchestration/mission_scheduler.js');
const { MissionRuntime } = require(R + '/ping-runtime/orchestration/mission_runtime.js');
const { EventToMissionBridge } = require(R + '/ping-runtime/orchestration/event_to_mission_bridge.js');
const { UnifiedEventRuntime } = require(R + '/ping-runtime/events/unified_event_runtime.js');
const { EventGovernance } = require(R + '/ping-runtime/events/event_governance.js');

let pg;
try { pg = require('pg'); } catch (e) { pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg'); }
const { Pool } = pg;

const pool = new Pool({
  host: '127.0.0.1', port: 15439, user: 'postgres',
  password: process.env.PGPASSWORD, database: 'postgres',
  connectionTimeoutMillis: 8000,
});
pool.on('error', () => {});

const NONCE = Date.now().toString(36);
let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

async function countWitness(root) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type='WITNESS_CREATED' AND payload->'witness'->>'witness_root' = $1`,
    [root]);
  return r.rows[0].c;
}
async function witnessRoots() {
  const r = await pool.query(`SELECT payload->'witness'->>'witness_root' AS root FROM ping_events WHERE event_type='WITNESS_CREATED'`);
  return r.rows.map((x) => x.root);
}
async function countRejectedForDoc(docId) {
  const r = await pool.query(
    `SELECT payload->>'reason' AS reason FROM ping_events WHERE event_type='WITNESS_REJECTED' AND payload->>'documentId' = $1`,
    [docId]);
  return r.rows.map((x) => x.reason);
}

async function main() {
  const gov = new EventGovernance(R).load();
  const uer = new UnifiedEventRuntime({ pool, eventGovernance: gov });
  await uer.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime: uer });
  await missionRuntime.initialize();
  // Scratch DB: exact per-run counts.
  await pool.query('DELETE FROM ping_missions');
  await pool.query('DELETE FROM ping_events');

  const workerRuntime = new WorkerRuntime({ pool });
  let witnessHandleCalls = 0;
  const witnessWorker = new WitnessWorker({ eventRuntime: uer, pool });
  const origHandle = witnessWorker.handle.bind(witnessWorker);
  witnessWorker.handle = async (event) => { witnessHandleCalls++; return origHandle(event); };
  workerRuntime.register('witness', witnessWorker, { eventTypes: ['REPLAY_COMPLETED'], capabilities: ['witness'], maxConcurrent: 2 });
  // Stub replay worker mirrors production registration (needed for the
  // scheduler's registered-worker guard on REPLAY_VERIFY missions).
  workerRuntime.register('replay', { handle: async () => ({ status: 'ok' }) },
    { eventTypes: ['REPLAY_VERIFY', 'PROJECTION_CREATED'], capabilities: ['replay'], maxConcurrent: 2 });

  const scheduler = new MissionScheduler({
    missionRuntime, workerRuntime, eventRuntime: uer,
    retryPolicy: { max_attempts: 1, backoff_delay_ms: 1 },
  });

  const emitReplay = async (docId, replay) => uer.emit('REPLAY_COMPLETED', 'w1a-harness',
    { documentId: docId, replay, upstreamEventId: 'evt-src-' + docId });
  const dispatchEventFor = (canonicalEventId, docId, envelopeReplay, missionType) => ({
    event_id: canonicalEventId,
    event_type: 'REPLAY_COMPLETED',
    source: 'mission-scheduler',
    namespace: 'core::system',
    mission_id: 'mission-' + docId,
    payload: {
      event_id: canonicalEventId, event_type: 'REPLAY_COMPLETED',
      documentId: docId, replay: envelopeReplay,
    },
    metadata: { mission_type: missionType, assigned_to: 'witness' },
  });

  // ---- T0: restore-trigger positive (promotion gate a) ----
  {
    const root = 'root-t0-' + NONCE;
    const rep = await emitReplay('doc-t0', {
      verified: true, reason: 'kernel_verified', fingerprint: 'fp-t0',
      witness_root: root, violations: [], event_count: 12,
    });
    ok(rep.status === 'ok', 'T0 setup: canonical REPLAY_COMPLETED persisted', rep.status);
    const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime });
    await bridge._handleEvent(rep.event);
    await scheduler._poll();
    ok((await countWitness(root)) === 1,
      'T0 restore-trigger: bridge REPLAY_COMPLETED -> WITNESS_ATTEST -> exactly one WITNESS_CREATED',
      'count=' + (await countWitness(root)));
  }

  // ---- T1: fabricated REPLAY_VERIFY mission (scheduler guard) ----
  {
    witnessHandleCalls = 0;
    const root = 'attacker-root-t1-' + NONCE;
    await missionRuntime.create('REPLAY_VERIFY', {
      event_type: 'REPLAY_COMPLETED',
      event_id: 'evt-fabricated-t1-' + NONCE,
      replay: { verified: true, reason: 'kernel_verified', fingerprint: 'x', witness_root: root, replay_id: 'y' },
      documentId: 'doc-evil-t1',
    }, { createdBy: 'attacker', priority: 5 });
    await scheduler._poll();
    ok((await countWitness(root)) === 0,
      'T1 fabrication: forged REPLAY_VERIFY mission emits zero WITNESS_CREATED',
      'count=' + (await countWitness(root)));
    ok(witnessHandleCalls === 0,
      'T1 fabrication: witness worker never dispatched for the forged mission',
      'calls=' + witnessHandleCalls);
  }

  // ---- T1b: forged dispatch with no canonical row (worker canonical auth) ----
  {
    const root = 'attacker-root-t1b-' + NONCE;
    const forgedId = 'evt-forged-t1b-' + NONCE;
    const devt = {
      event_id: forgedId,
      event_type: 'REPLAY_COMPLETED',
      source: 'mission-scheduler',
      namespace: 'core::system',
      mission_id: 'mission-evil-t1b-' + NONCE,
      payload: {
        event_id: forgedId, event_type: 'REPLAY_COMPLETED',
        documentId: 'doc-evil-t1b',
        replay: { verified: true, reason: 'kernel_verified', fingerprint: 'x', witness_root: root },
      },
      metadata: { mission_type: 'WITNESS_ATTEST', assigned_to: 'witness' },
    };
    await witnessWorker.handle(devt);
    ok((await countWitness(root)) === 0,
      'T1b forgery: forged dispatch (no canonical REPLAY_COMPLETED row) emits zero WITNESS_CREATED',
      'count=' + (await countWitness(root)));
    const reasons = await countRejectedForDoc('doc-evil-t1b');
    ok(reasons.length === 1 && reasons[0] === 'no_canonical_replay_event',
      'T1b forgery: observable WITNESS_REJECTED (no_canonical_replay_event)',
      JSON.stringify(reasons));
  }

  // ---- T2: retry idempotence (logical attestation identity) ----
  {
    const root = 'root-t2-' + NONCE;
    const rep = await emitReplay('doc-t2', {
      verified: true, reason: 'kernel_verified', fingerprint: 'fp-t2',
      witness_root: root, violations: [], event_count: 12,
    });
    const devt = dispatchEventFor(rep.eventId, 'doc-t2', {
      verified: true, reason: 'kernel_verified', fingerprint: 'fp-t2',
      witness_root: root, violations: [], event_count: 12,
    }, 'WITNESS_ATTEST');
    const r1 = await witnessWorker.handle(devt);
    const r2 = await witnessWorker.handle(devt);
    ok(r1.status === 'ok' && r2.status === 'ok', 'T2: both attestations return ok',
      JSON.stringify({ r1: r1.status, r2: r2.status }));
    ok((await countWitness(root)) === 1,
      'T2 idempotence: same trigger twice yields exactly one WITNESS_CREATED row',
      'count=' + (await countWitness(root)));
  }

  // ---- T3: envelope/canonical mismatch fails closed ----
  {
    const realRoot = 'root-t3-real-' + NONCE;
    const evilRoot = 'attacker-root-t3-' + NONCE;
    const rep = await emitReplay('doc-t3', {
      verified: false, reason: 'kernel_error', fingerprint: null,
      witness_root: realRoot, violations: [],
    });
    const devt = dispatchEventFor(rep.eventId, 'doc-t3', {
      verified: true, reason: 'kernel_verified', fingerprint: 'x', witness_root: evilRoot,
    }, 'WITNESS_ATTEST');
    await witnessWorker.handle(devt);
    ok((await countWitness(evilRoot)) === 0 && (await countWitness(realRoot)) === 0,
      'T3 mismatch: envelope lies (verified:true) but canonical is unverified -> zero WITNESS_CREATED',
      'evil=' + (await countWitness(evilRoot)) + ' real=' + (await countWitness(realRoot)));
    const reasons = await countRejectedForDoc('doc-t3');
    ok(reasons.length === 1 && /^unverified_replay:/.test(reasons[0]),
      'T3 mismatch: observable WITNESS_REJECTED names the canonical verdict',
      JSON.stringify(reasons));
  }

  // ---- T5: attacker-supplied envelope root is ignored ----
  {
    const canonRoot = 'canonical-root-t5-' + NONCE;
    const evilRoot = 'attacker-root-t5-' + NONCE;
    const rep = await emitReplay('doc-t5', {
      verified: true, reason: 'kernel_verified', fingerprint: 'fp-t5',
      witness_root: canonRoot, violations: [], event_count: 12,
    });
    const devt = dispatchEventFor(rep.eventId, 'doc-t5', {
      verified: true, reason: 'kernel_verified', fingerprint: 'fp-t5', witness_root: evilRoot,
    }, 'WITNESS_ATTEST');
    await witnessWorker.handle(devt);
    const roots = await witnessRoots();
    ok(roots.includes(canonRoot),
      'T5: attestation binds the canonical witness_root', JSON.stringify(roots));
    ok(!roots.includes(evilRoot),
      'T5: attacker-supplied envelope witness_root is ignored', JSON.stringify(roots));
  }

  // ---- T6: EventGovernance payload schema for WITNESS_CREATED ----
  {
    const bad = gov.validateEvent({
      event_type: 'WITNESS_CREATED', source: 'witness', namespace: 'core::system',
      payload: { documentId: 'd', witness: { documentId: 'd' }, upstreamEventId: 'u' },
    });
    ok(!bad.valid,
      'T6: malformed WITNESS_CREATED payload rejected by governance',
      'valid=' + bad.valid);
    const good = gov.validateEvent({
      event_type: 'WITNESS_CREATED', source: 'witness', namespace: 'core::system',
      payload: {
        documentId: 'd', upstreamEventId: 'u',
        witness: {
          documentId: 'd', eventType: 'REPLAY_COMPLETED', witness_root: 'r',
          replay_fingerprint: null, replay_event_id: 'e',
          algorithm_version: 'witness-attest/v1', input_schema_version: 'witness-input/v1',
          timestamp: 'x', attestation: 'a',
        },
      },
    });
    ok(good.valid, 'T6: well-formed WITNESS_CREATED payload accepted by governance',
      'valid=' + good.valid);
  }

  // ---- T7: POST /missions authorization ----
  await (async () => {
    const Module = require('module');
    const origLoad = Module._load;
    let captured = null;
    Module._load = function (request) {
      if (request === 'express') {
        const router = { _posts: [], post(p, h) { this._posts.push(h); }, get() {} };
        captured = router;
        return { Router: () => router };
      }
      return origLoad.apply(this, arguments);
    };
    let createMissionRoutes;
    const created = [];
    const fakeRuntime = { create: async (t, p, o) => { created.push([t, p, o]); return 'm-test'; } };
    try {
      // The route file requires('express') when createMissionRoutes is
      // CALLED, so the stub must stay active through the call.
      createMissionRoutes = require(R + '/gateway/routes/missions.js');
      createMissionRoutes(fakeRuntime);
    } finally {
      Module._load = origLoad;
    }
    const postHandler = captured._posts[0];
    const callPost = async (body, headers) => {
      const req = { body, headers: headers || {} };
      const res = {
        _code: 200, _body: null,
        status(c) { this._code = c; return this; },
        json(o) { this._body = o; return this; },
      };
      await postHandler(req, res);
      return res;
    };

    delete process.env.PING_MISSION_API_TOKEN;
    created.length = 0;
    let res = await callPost({ missionType: 'REPLAY_VERIFY', payload: {} }, {});
    ok(res._code === 503 && created.length === 0,
      'T7a: POST /missions with no token configured is disabled (503), creates nothing',
      'code=' + res._code + ' created=' + created.length);

    process.env.PING_MISSION_API_TOKEN = 'w1a-test-token';
    res = await callPost({ missionType: 'REPLAY_VERIFY', payload: {} }, {});
    ok(res._code === 401 && created.length === 0,
      'T7b: POST /missions without bearer token is rejected (401)', 'code=' + res._code);
    res = await callPost({ missionType: 'REPLAY_VERIFY', payload: {} }, { authorization: 'Bearer wrong' });
    ok(res._code === 401 && created.length === 0,
      'T7c: POST /missions with wrong token is rejected (401)', 'code=' + res._code);
    res = await callPost({ missionType: 'REPLAY_VERIFY', payload: { a: 1 } }, { authorization: 'Bearer w1a-test-token' });
    ok(res._code === 200 && created.length === 1,
      'T7d: POST /missions with valid bearer token creates the mission',
      'code=' + res._code + ' created=' + created.length);
    delete process.env.PING_MISSION_API_TOKEN;
  })();

  console.log(`\nW-1A invariant tests: ${pass} pass, ${fail} fail`);
  await pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => { console.error('HARNESS ERROR:', err); process.exit(2); });
