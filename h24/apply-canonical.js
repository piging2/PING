// H24 applier for ping-runtime/workers/canonical_workers.js
// Patch A: replace lines 447-507 (1-based; WitnessWorker doc comment + class)
//          with the new H24 block. Patch B: wire witnessSigner into the
//          workers array entry (default off).
const fs = require('fs');
const path = '/home/nolan/worktrees/ping-harvest-12h/ping-runtime/workers/canonical_workers.js';
const blockPath = '/tmp/h24/new_witness_block.js';

const lines = fs.readFileSync(path, 'utf8').split('\n');
function L(n) { return lines[n - 1]; } // 1-based
function must(cond, msg) { if (!cond) { console.error('ABORT: ' + msg); process.exit(1); } }

// --- Patch A boundary sanity (1-based) ---
must(L(447) === '/**', 'line 447 should be /**, got: ' + JSON.stringify(L(447)));
must(L(448).includes('WitnessWorker'), 'line 448 should mention WitnessWorker');
must(L(451) === 'class WitnessWorker extends BaseWorker {', 'line 451 class open mismatch: ' + JSON.stringify(L(451)));
must(L(507) === '}', 'line 507 should close the class, got: ' + JSON.stringify(L(507)));
must(L(508) === '', 'line 508 should be blank');
must(L(509) === '/**' && L(510).includes('LineageWorker'), 'lines 509-510 should start LineageWorker comment');

let block = fs.readFileSync(blockPath, 'utf8');
must(block.includes('class WitnessWorker extends BaseWorker'), 'block missing WitnessWorker class');
must(block.includes('normalizeWitnessSigner'), 'block missing normalizeWitnessSigner');
if (block.endsWith('\n')) block = block.slice(0, -1);

let out = [...lines.slice(0, 446), block, ...lines.slice(507)];

// --- Patch B: witness workers-array entry ---
const oldEntry = "    { name: 'witness', Worker: WitnessWorker, eventTypes: ['WITNESS_CREATE', 'REPLAY_COMPLETED'] },";
const newEntry = [
  "    // H24: witnessSigner is default-off; resolveWitnessSigner returns undefined",
  "    // unless options.witnessSigner is set or PING_WITNESS_SIGNING=1/'true'.",
  "    { name: 'witness', Worker: WitnessWorker, eventTypes: ['WITNESS_CREATE', 'REPLAY_COMPLETED'], options: { witnessSigner: resolveWitnessSigner(options) } },",
].join('\n');
let joined = out.join('\n');
const occurrences = joined.split(oldEntry).length - 1;
must(occurrences === 1, 'expected exactly 1 witness entry, found ' + occurrences);
joined = joined.replace(oldEntry, newEntry);

fs.writeFileSync(path, joined);
console.log('PATCHED OK: WitnessWorker replaced (lines 447-507), witness entry wired.');
