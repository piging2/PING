'use strict';
// One-shot fix: rewrite the 6 MC_FYD_STAGE_COMPLETED events for the take3
// mission with the Lane B contract shape evidence_refs=[{kind,ref}],
// recomputing the content-derived event_id with the driver's exact formula.
// Run on the Pig (node). Usage: node fix-evidence-refs.js <journal-path>
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
  if (e.event_type !== 'MC_FYD_STAGE_COMPLETED') return line;
  if ((e.event_data && e.event_data.mission_id) !== MISSION) return line;
  const refs = e.event_data.evidence_refs;
  if (!Array.isArray(refs) || refs.length === 0 || typeof refs[0] !== 'string') return line;
  // Rewrite with the contract shape.
  e.event_data.evidence_refs = refs.map((r) => ({ kind: 'run-log', ref: r }));
  const seed = ['integrate', RUN_ID, e.event_type, canonicalJson(e.event_data)].join('|');
  e.event_id = 'mc-integrate-' + crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 12);
  fixed++;
  return JSON.stringify(e);
});
if (fixed !== 6) {
  console.error('expected 6 events, fixed ' + fixed);
  process.exitCode = 1;
} else {
  fs.writeFileSync(journalPath, out.join('\n'));
  console.log('fixed 6 events in ' + journalPath);
}
