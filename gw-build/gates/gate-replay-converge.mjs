/**
 * GW-BUILD committed gate (2026-09-24): repo-root default; JEV_SURGICAL override kept.
 * GW-REP new gate: REPLAY_COMPLETED retry convergence (verdict class).
 * Mirrors lane-g/repro-witness-remint.mjs but drives ReplayWorker.handle twice
 * on the SAME trigger event. Acceptance: single REPLAY_COMPLETED event_id
 * persisted, deduplicated:1. Uses the REAL UnifiedEventRuntime.emit and the
 * REAL ReplayWorker (no validator/governance: pure identity path).
 * Run on the Pig: JEV_SURGICAL=<tree> node gate-replay-converge.mjs
 */
import { createRequire } from 'node:module';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WT = process.env.JEV_SURGICAL || REPO_ROOT;
const require = createRequire(WT + '/package.json');
const { ReplayWorker } = require(WT + '/ping-runtime/workers/canonical_workers.js');
const { UnifiedEventRuntime } = require(WT + '/ping-runtime/events/unified_event_runtime.js');

const rows = new Map();
const pool = {
  async query(text, params) {
    if (text.startsWith('INSERT INTO ping_events')) {
      const [event_id] = params;
      if (rows.has(event_id)) return { rowCount: 0, rows: [] };
      rows.set(event_id, { event_id, payload: params[4] });
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

const runtime = new UnifiedEventRuntime({ pool });
const worker = new ReplayWorker({ eventRuntime: runtime }); // no provider: structural no-op path

const trigger = {
  event_id: 'claim-aaaabbbbccccdddd',
  event_type: 'CLAIM_CREATED',
  source: 'mission-scheduler',
  namespace: 'core::system',
  mission_id: 'replaymission1234',
  payload: { documentId: 'doc-77' },
  metadata: { mission_type: 'REPLAY_CREATE', correlation_id: 'corr-9', causation_id: 'claim-aaaabbbbccccdddd' },
};

const r1 = await worker.handle(structuredClone(trigger));
await new Promise((r) => setTimeout(r, 25));
const r2 = await worker.handle(structuredClone(trigger));

const replayEvents = [];
for (const [id, row] of rows) {
  const p = JSON.parse(row.payload);
  if (p && p.replay) replayEvents.push({ event_id: id, reason: p.replay.reason, ts: p.replay.timestamp });
}

console.log('attempt 1:', r1.status, '| attempt 2:', r2.status);
console.log('REPLAY_COMPLETED events persisted:', replayEvents.length);
for (const w of replayEvents) console.log('  -', w.event_id.slice(0, 16) + '...', w.reason, w.ts);
console.log('runtime stats:', JSON.stringify(runtime._stats));

if (replayEvents.length === 2 && replayEvents[0].event_id !== replayEvents[1].event_id) {
  console.log('GATE FAIL: retry reminted REPLAY_COMPLETED identity.');
  process.exit(2);
} else if (replayEvents.length === 1 && runtime._stats.deduplicated === 1) {
  console.log('GATE PASS: REPLAY_COMPLETED retry converged (single event_id, deduplicated:1).');
  process.exit(0);
} else {
  console.log('GATE INCONCLUSIVE: unexpected shape.');
  process.exit(3);
}
