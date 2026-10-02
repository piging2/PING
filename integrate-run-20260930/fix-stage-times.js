'use strict';
// One-shot fix: the driver's post-hoc stage instrumentation stamped
// MC_FYD_STAGE_STARTED and MC_FYD_STAGE_COMPLETED with the SAME timestamp
// (the envelope's single emitted_at), so the projector's "latest event per
// stage wins" fold tiebreaks on event_id and misorders some stages as
// RUNNING. Fix: COMPLETED gets emitted_at + 1ms (documented instrumentation
// epsilon), STARTED keeps emitted_at. Event IDs are recomputed with the
// driver's exact content-derived formula.
// Run on the Pig (node). Usage: node fix-stage-times.js <journal-path>
const crypto = require('crypto');
const fs = require('fs');

const RUN_ID = 'integrate-coppersmith-20260930';
const MISSION = 'a32db704f0aa81c3';

function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
}

function shiftMs(iso, ms) {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

const journalPath = process.argv[2];
const lines = fs.readFileSync(journalPath, 'utf8').split('\n');
let fixed = 0;
const out = lines.map((line) => {
  const t = line.trim();
  if (!t) return line;
  let e;
  try { e = JSON.parse(t); } catch (_) { return line; }
  if (e.event_type !== 'MC_FYD_STAGE_STARTED' && e.event_type !== 'MC_FYD_STAGE_COMPLETED') return line;
  if ((e.event_data && e.event_data.mission_id) !== MISSION) return line;
  if (e.event_type === 'MC_FYD_STAGE_COMPLETED') {
    const base = e.event_data.finished_at || e.timestamp;
    const shifted = shiftMs(base, 1);
    e.timestamp = shifted;
    e.event_data.finished_at = shifted;
    e.event_data.timestamp_note = 'instrumentation epsilon: +1ms on COMPLETED so the projector fold orders it after STARTED (both derive from the single envelope emitted_at)';
  }
  const seed = ['integrate', RUN_ID, e.event_type, canonicalJson(e.event_data)].join('|');
  e.event_id = 'mc-integrate-' + crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 12);
  fixed++;
  return JSON.stringify(e);
});
if (fixed !== 12) {
  console.error('expected 12 stage events, fixed ' + fixed);
  process.exitCode = 1;
} else {
  fs.writeFileSync(journalPath, out.join('\n'));
  console.log('fixed 12 stage events in ' + journalPath);
}
