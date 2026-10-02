'use strict';
// falsify-driver.js - drives the EFFECT #2 falsification experiment.
// Trial 1 (race): process A commits after 2500ms; process B starts at 500ms.
//   Both should pass the idempotency gate before A's commit lands.
// Trial 2 (control): process B starts after A's commit is known durable.
// Counts physical effects via the shared counter file.
// No em dashes.
const { spawn } = require('child_process');
const fs = require('fs');

const FALSIFY = '/tmp/falsify-effect2.js';
const COUNTER = '/tmp/falsify-counter.jsonl';

function run(role, missionId, commitDelayMs, startDelayMs) {
  return new Promise((resolve) => {
    const p = spawn('node', [FALSIFY, role, missionId, COUNTER, String(commitDelayMs), String(startDelayMs)],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { process.stderr.write(`[${role}] ${d}`); });
    p.on('exit', (code) => resolve({ code, out: out.trim() }));
  });
}
function effectCount() {
  try {
    return fs.readFileSync(COUNTER, 'utf8').split('\n').filter((l) => l.trim()).length;
  } catch (e) { return 0; }
}

async function main() {
  // Trial 1: the gate race.
  try { fs.unlinkSync(COUNTER); } catch (e) {}
  const mid1 = 'falsify-race-' + Date.now();
  console.log('TRIAL 1 (race): A commits late, B starts mid-flight');
  const [ra, rb] = await Promise.all([
    run('a', mid1, 2500, 0),
    run('b', mid1, 0, 500),
  ]);
  console.log('  A:', ra.out, ' B:', rb.out);
  console.log('  PHYSICAL EFFECTS (trial 1):', effectCount());

  // Trial 2: control, B after A completes.
  try { fs.unlinkSync(COUNTER); } catch (e) {}
  const mid2 = 'falsify-control-' + Date.now();
  console.log('TRIAL 2 (control): B starts after A completes');
  const rc = await run('a', mid2, 0, 0);
  const rd = await run('b', mid2, 0, 0);
  console.log('  A:', rc.out, ' B:', rd.out);
  console.log('  PHYSICAL EFFECTS (trial 2):', effectCount());
}
main().catch((e) => { console.error(e); process.exit(1); });
