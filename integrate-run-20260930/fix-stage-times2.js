'use strict';
// Fix part 2: the previous fix set COMPLETED's top-level timestamp from the
// envelope clock but left STARTED on the wall clock, inverting the fold
// order. Correct: STARTED.timestamp = event_data.started_at (the envelope's
// real emitted_at); COMPLETED.timestamp stays at finished_at (= started_at +
// 1ms instrumentation epsilon). Event IDs recomputed with the driver's
// exact content-derived formula.
// Run on the Pig (node). Usage: node fix-stage-times2.js <journal-path>
const crypto = require('crypto');
const fs = require('fs');

const RUN_ID = 'integrate-coppersmith-20260930';
const MISSION = 'a32db704f0aa81c3';

function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
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
  if (e.event_type === 'MC_FYD_STAGE_STARTED' && e.event_data.started_at) {
    e.timestamp = e.event_data.started_at;
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
