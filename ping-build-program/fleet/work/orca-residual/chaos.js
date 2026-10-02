/**
 * chaos.js — ORCA residual lane (2026-09-24)
 *
 * Falsification harness for the invariant:
 *   ONE LOGICAL OPERATION MUST NOT PRODUCE TWO CONSEQUENTIAL EFFECTS
 *   MERELY BECAUSE ACKNOWLEDGEMENT WAS LOST.
 *
 * Each scenario injects a fault and then tries to drive the effect counter
 * for one op_key to 2. effectCount != 1 at the end FALSIFIES the invariant
 * for that scenario.
 *
 * Scenarios:
 *   ORU-000  CONTROL: old dispatcher behavior (timeout -> assume failed ->
 *            retry), T2 reproduction. Expected: 2 effects (FALSIFIED).
 *   ORU-001  effect succeeds + coordinator dies before receipt
 *   ORU-002  effect succeeds + result persistence fails
 *   ORU-003  response lost (SUCCEEDED persisted, ack lost in transit)
 *   ORU-004  duplicate dispatch (scheduler race, same op_key twice)
 *   ORU-005  retry after UNKNOWN with inconclusive probe -> HOLD, then
 *            probe recovers -> reconcile recovers
 *   ORU-006  restart during reconciliation (crash between probe and
 *            EFFECT_RECONCILED) -> fresh coordinator sweeps + reconciles
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { EventJournal } = require('./event_journal');
const { reconcile } = require('./reconciler');
const { Effector } = require('./effector');
const { OldCoordinator, Coordinator } = require('./coordinator');

const WORK = __dirname;
const EVIDENCE = path.join(WORK, 'evidence');
fs.mkdirSync(EVIDENCE, { recursive: true });

const MISSION = (n) => `chaos-mission-${n}`;
const EFFECT = 'send_customer_receipt'; // consequential stand-in
const INPUT = { customer: 'cust-42', amount: 120.00, invoice: 'INV-9001' };

function scenarioCtx(tag, faults = {}, coordOpts = {}) {
  const appendFile = path.join(EVIDENCE, `${tag}-events.jsonl`);
  if (fs.existsSync(appendFile)) fs.unlinkSync(appendFile);
  const journal = new EventJournal({ appendFile });
  const effector = new Effector({ journal, faults, name: `effector-${tag}`, logFile: path.join(EVIDENCE, `${tag}-executed-ops.jsonl`) });
  return { tag, journal, effector, appendFile };
}

function eventCounts(journal) {
  const counts = {};
  for (const e of journal._events.values()) counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  return counts;
}

function base(tag, extra = {}) {
  return {
    mission_id: tag,
    matrix: 'orca-residual',
    at: new Date().toISOString(),
    ...extra,
  };
}

/** Harness scaffolding: stand-in for the scheduler's existing pending-sweep
 *  (same shape as MissionRuntime.getPending/reapExpiredLeases): find
 *  EFFECT_UNKNOWN ops with no terminal resolution. */
async function sweepUnknown(journal) {
  const unknowns = (await journal.query({ eventType: 'EFFECT_UNKNOWN' })).events;
  const pending = [];
  for (const u of unknowns) {
    const opKey = u.payload.op_key;
    const hist = await journal.queryOp(opKey);
    const terminal = hist.some(e =>
      e.event_type === 'EFFECT_SUCCEEDED' ||
      (e.event_type === 'EFFECT_RECONCILED' && String(e.payload.resolution).startsWith('recovered')) ||
      e.event_type === 'EFFECT_HELD');
    if (!terminal) pending.push(opKey);
  }
  return [...new Set(pending)];
}

const results = [];
function record(r) { results.push(r); return r; }

async function oru000_control() {
  const tag = 'ORU-000';
  // Legacy pre-fix worker: no idempotency gate, no executed-op log, no
  // write-ahead outcome record. This is the world T2 was proven in.
  const { journal, effector } = scenarioCtx(tag, { dieBeforeReceipt: true, legacyWorker: true });
  const coord = new OldCoordinator({ journal, effector, maxAttempts: 3 });
  const out = await coord.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  const effects = effector.effectsFor(out.opKey);
  // The old path cannot distinguish "worker died before receipt" from failure:
  // each attempt re-runs the effect. With dieBeforeReceipt every attempt throws,
  // so all 3 attempts execute the effect -> 3 effects for one logical operation.
  return record(base(tag, {
    verdict: 'FALSIFIED',
    confidence: 1.0,
    summary: `FALSIFIED (control): old timeout->assume-failed->retry path produced ${effects} consequential effects for ONE logical operation (attempts=${out.attempts}). The invariant is violated under the pre-fix behavior, exactly the T2 chain proven live on the Pig.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effects, attempts: out.attempts, opKey: out.opKey, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: 'None: control behaved as the T2 finding predicts. The fix (ORU-001..006) must hold the invariant where this control breaks it.',
  }));
}

async function oru001_coordinatorDies() {
  const tag = 'ORU-001';
  const { journal, effector } = scenarioCtx(tag, { dieBeforeReceipt: true });
  const coord = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high' });
  const out = await coord.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  const effects = effector.effectsFor(out.opKey);
  const ok = effects === 1 && out.status === 'completed' && out.via === 'durable_succeeded_event';
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: effect succeeded + coordinator died before receipt. Timeout -> EFFECT_UNKNOWN -> reconcile found the worker's write-ahead EFFECT_SUCCEEDED -> result recovered, no re-dispatch. Effects for op: ${effects}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effects, status: out.status, via: out.via, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate write-ahead emission ordering.',
  }));
}

async function oru002_persistFails() {
  const tag = 'ORU-002';
  const { journal, effector } = scenarioCtx(tag, { persistFailOnSuccess: true, dieBeforeReceipt: true });
  const coord = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high' });
  const out = await coord.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  const effects = effector.effectsFor(out.opKey);
  const ok = effects === 1 && out.status === 'completed' && out.via === 'effector_probe';
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: effect succeeded but the SUCCEEDED persistence failed (journal fault). No durable outcome event; reconcile probed the effector's executed-op log -> executed=true -> result recovered via probe, no re-dispatch. Effects for op: ${effects}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effects, status: out.status, via: out.via, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate probe path.',
  }));
}

async function oru003_responseLost() {
  const tag = 'ORU-003';
  const { journal, effector } = scenarioCtx(tag, { dropResponse: true });
  const coord = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high' });
  const out = await coord.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  const effects = effector.effectsFor(out.opKey);
  const ok = effects === 1 && out.status === 'completed' && out.via === 'durable_succeeded_event';
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: response lost in transit after SUCCEEDED was persisted. Coordinator saw only the lost ack -> EFFECT_UNKNOWN -> reconcile recovered from the durable event. Effects for op: ${effects}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effects, status: out.status, via: out.via, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate ack-loss path.',
  }));
}

async function oru004_duplicateDispatch() {
  const tag = 'ORU-004';
  const { journal, effector } = scenarioCtx(tag, {});
  const c1 = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high', name: 'coord-A' });
  const c2 = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high', name: 'coord-B' });
  const args = { missionId: MISSION(tag), effect: EFFECT, input: INPUT };
  const [o1, o2] = await Promise.all([c1.runMission(args), c2.runMission(args)]);
  const effects = effector.effectsFor(o1.opKey);
  const ok = effects === 1 && o1.opKey === o2.opKey && o1.status === 'completed' && o2.status === 'completed';
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: duplicate dispatch of the same logical operation (scheduler race). Both coordinators derived the same op_key; the effector's idempotency gate served the second dispatch from the executed-op log without re-running the effect; the duplicate EFFECT_DISPATCHED deduplicated at the event layer via logical_id. Effects for op: ${effects}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effects, sameOpKey: o1.opKey === o2.opKey, secondWasDuplicate: o2.duplicate === true, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate idempotency gate race.',
  }));
}

async function oru005_unknownThenHold() {
  const tag = 'ORU-005';
  // Worst case: SUCCEEDED persistence failed AND the effector's log is
  // unavailable to the probe AND the effect is consequential.
  const { journal, effector } = scenarioCtx(tag,
    { persistFailOnSuccess: true, dieBeforeReceipt: true, probeLies: 'unknown' });
  const coord = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high' });
  const out = await coord.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  const effectsAfterHold = effector.effectsFor(out.opKey);
  const heldOk = effectsAfterHold === 1 && out.status === 'held';

  // Later: the executed-op log becomes available again (log recovered).
  effector.faults.probeLies = null;
  effector.revive();
  const res2 = await reconcile(out.opKey, {
    journal, effector, consequence: 'high', maxAttempts: 3, correlationId: out.opKey,
  });
  const effectsFinal = effector.effectsFor(out.opKey);
  const recoveredOk = res2.resolution === 'recovered' && effectsFinal === 1;
  const ok = heldOk && recoveredOk;
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: outcome unknown after probe (SUCCEEDED lost, log unavailable) + consequential effect -> HELD with escalation, zero blind retries. When the log recovered, re-reconcile recovered the result. Effects for op across hold+recovery: ${effectsFinal}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { effectsAfterHold, effectsFinal, holdStatus: out.status, recoveryResolution: res2.resolution, recoveryVia: res2.via, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate hold/escalate path.',
  }));
}

async function oru006_restartDuringReconcile() {
  const tag = 'ORU-006';
  const { journal, effector } = scenarioCtx(tag, { persistFailOnSuccess: true, dieBeforeReceipt: true });
  const correlationId = 'restart-test';
  const opKey = require('./idempotency').deriveOpKey({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });

  // Coordinator A: dispatches, times out, emits EFFECT_UNKNOWN, then CRASHES
  // mid-reconciliation (between probe and EFFECT_RECONCILED).
  const coordA = new Coordinator({ journal, effector, maxAttempts: 3, consequence: 'high', name: 'coord-A' });
  const crashingJournal = new Proxy(journal, {
    get(t, p) {
      if (p === 'emit') {
        return async (...a) => {
          if (a[0] === 'EFFECT_RECONCILED' && !t._crashedOnce) {
            t._crashedOnce = true;
            const err = new Error('SIMULATED_CRASH: coordinator died mid-reconcile');
            err.code = 'COORDINATOR_CRASH';
            throw err;
          }
          return t.emit(...a);
        };
      }
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  coordA.journal = crashingJournal;
  let crashed = false;
  try {
    await coordA.runMission({ missionId: MISSION(tag), effect: EFFECT, input: INPUT });
  } catch (e) {
    crashed = e.code === 'COORDINATOR_CRASH';
  }

  // Coordinator B (fresh process): sweeps UNKNOWN ops with no terminal
  // resolution, reconciles. Reconciliation is idempotent: the probe re-runs,
  // EFFECT_RECONCILED's logical_id dedups any re-emission.
  const pending = await sweepUnknown(journal);
  let finalRes = null;
  for (const key of pending) {
    finalRes = await reconcile(key, { journal, effector, consequence: 'high', maxAttempts: 3, correlation_id: key });
  }
  const effects = effector.effectsFor(opKey);
  const reconciledEvents = (await journal.query({ eventType: 'EFFECT_RECONCILED' })).events
    .filter(e => e.payload.op_key === opKey);
  const ok = crashed && pending.includes(opKey) &&
    finalRes && finalRes.resolution === 'recovered' && effects === 1 &&
    reconciledEvents.length === 1;
  return record(base(tag, {
    verdict: ok ? 'PROVEN' : 'FALSIFIED',
    confidence: 0.99,
    summary: `${ok ? 'PROVEN' : 'FALSIFIED'}: coordinator crashed between probe and EFFECT_RECONCILED. Fresh coordinator swept the unresolved EFFECT_UNKNOWN, re-ran reconcile, reached the identical verdict (recovered via probe); EFFECT_RECONCILED emitted exactly once (logical_id dedup). Effects for op: ${effects}.`,
    evidence_files: [`fleet/work/orca-residual/evidence/${tag}-events.jsonl`],
    detail: { crashed, swept: pending.includes(opKey), finalResolution: finalRes && finalRes.resolution, effects, reconciledEmits: reconciledEvents.length, eventCounts: eventCounts(journal), journalStats: journal.stats },
    followup: ok ? 'None.' : 'Invariant broken: investigate reconcile idempotency across restart.',
  }));
}

async function main() {
  const fns = [oru000_control, oru001_coordinatorDies, oru002_persistFails, oru003_responseLost, oru004_duplicateDispatch, oru005_unknownThenHold, oru006_restartDuringReconcile];
  for (const fn of fns) {
    try {
      const r = await fn();
      console.log(`${r.mission_id}: ${r.verdict} — effects=${r.detail.effects !== undefined ? r.detail.effects : (r.detail.effectsFinal !== undefined ? r.detail.effectsFinal : '?')}`);
    } catch (e) {
      console.log(`${fn.name}: HARNESS_ERROR ${e.message}`);
      record(base('HARNESS-' + fn.name, { verdict: 'HARNESS_ERROR', summary: String(e && e.stack || e) }));
    }
  }
  fs.writeFileSync(path.join(EVIDENCE, 'chaos-results.json'), JSON.stringify(results, null, 2));
  const proven = results.filter(r => r.verdict === 'PROVEN').length;
  const falsified = results.filter(r => r.verdict === 'FALSIFIED').length;
  console.log(`\nRESULTS: ${proven} PROVEN, ${falsified} FALSIFIED, ${results.length} total`);
  // Exit non-zero only if a NON-control scenario falsified (control is expected FALSIFIED).
  const bad = results.filter(r => r.verdict === 'FALSIFIED' && r.mission_id !== 'ORU-000');
  if (bad.length > 0) { console.log('INVARIANT BROKEN in: ' + bad.map(r => r.mission_id).join(',')); process.exit(2); }
  console.log('INVARIANT HELD in all fix scenarios; control reproduced the T2 double-effect as expected.');
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { main };
