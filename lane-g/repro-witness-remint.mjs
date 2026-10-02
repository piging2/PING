/**
 * LANE G minimal repro: mission retry remints the logical WITNESS_CREATED identity.
 *
 * Run on the Pig:  node ~/workspace/lane-g/repro-witness-remint.mjs
 * (requires the jev-surgical worktree at /home/nolan/ping/worktrees/jev-surgical)
 *
 * Scenario: a WITNESS_CREATE mission is dispatched; the worker handles it and
 * emits WITNESS_CREATED; the mission then fails AFTER the emit (or the lease
 * expires / the response is lost) and the scheduler re-dispatches the SAME
 * mission (same mission_id, same triggering event). handle() runs again.
 *
 * Expected (idempotent): the second emission converges on the same event_id
 * (journal ON CONFLICT DO NOTHING dedupes; no duplicate attestation).
 * Actual (2026-09-24): the emitted payload embeds witness.timestamp = now(),
 * so the content-hash event_id differs per attempt -> two distinct
 * WITNESS_CREATED events persist for one logical attestation.
 *
 * Uses the REAL UnifiedEventRuntime.emit and the REAL WitnessWorker.handle.
 * The pg pool is faked with exact ON CONFLICT (event_id) DO NOTHING semantics.
 * No secrets involved; all ids synthetic.
 */
import { createRequire } from 'node:module';

const WT = process.env.JEV_SURGICAL || '/home/nolan/ping/worktrees/jev-surgical';
const require = createRequire(WT + '/package.json');
const { WitnessWorker } = require(WT + '/ping-runtime/workers/canonical_workers.js');
const { UnifiedEventRuntime } = require(WT + '/ping-runtime/events/unified_event_runtime.js');

// Fake pg pool: Map event_id -> stored row, honoring ON CONFLICT DO NOTHING.
const rows = new Map();
const pool = {
  async query(text, params) {
    if (text.startsWith('INSERT INTO ping_events')) {
      const [event_id] = params;
      if (rows.has(event_id)) return { rowCount: 0, rows: [] }; // conflict: no-op
      rows.set(event_id, { event_id, payload: params[4] });      // params[4] = JSON string
      return { rowCount: 1, rows: [] };
    }
    if (text.startsWith('SELECT payload FROM ping_events')) {
      const [event_id] = params;
      const r = rows.get(event_id);
      return { rows: r ? [{ payload: r.payload }] : [] };
    }
    throw new Error('unexpected query: ' + text.slice(0, 60));
  },
};

const runtime = new UnifiedEventRuntime({ pool }); // no validator/governance: pure identity path
const worker = new WitnessWorker({ eventRuntime: runtime });

// The scheduler re-dispatches the SAME mission: same triggering event.
const trigger = {
  event_id: 'replay-completed-aaaabbbbccccdddd',
  event_type: 'WITNESS_CREATE',
  source: 'mission-scheduler',
  namespace: 'core::system',
  mission_id: 'witnessmission1234',
  payload: { documentId: 'doc-42' },
  metadata: { mission_type: 'WITNESS_CREATE', correlation_id: 'corr-1', causation_id: 'replay-completed-aaaabbbbccccdddd' },
};

const r1 = await worker.handle(structuredClone(trigger));
await new Promise((r) => setTimeout(r, 25)); // attempt 2 happens later: fresh timestamp
const r2 = await worker.handle(structuredClone(trigger));

const witnessEvents = [];
for (const [id, row] of rows) {
  const p = JSON.parse(row.payload);
  if (p && p.witness) witnessEvents.push({ event_id: id, attestation: p.witness.attestation, ts: p.witness.timestamp });
}

console.log('attempt 1:', r1.status, '| attempt 2:', r2.status);
console.log('WITNESS_CREATED events persisted:', witnessEvents.length);
for (const w of witnessEvents) console.log('  -', w.event_id.slice(0, 16) + '...', w.attestation, w.ts);
console.log('runtime stats:', JSON.stringify(runtime._stats));

if (witnessEvents.length === 2 && witnessEvents[0].event_id !== witnessEvents[1].event_id) {
  console.log('REPRODUCED: one logical attestation -> two distinct WITNESS_CREATED event_ids (timestamp reminted the identity).');
  process.exit(2);
} else if (witnessEvents.length === 1) {
  console.log('OK: retry converged on a single event_id.');
  process.exit(0);
} else {
  console.log('UNEXPECTED outcome.');
  process.exit(3);
}
