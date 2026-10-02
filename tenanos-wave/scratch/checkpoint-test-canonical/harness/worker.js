/**
 * Worker child process for the durable checkpoint test.
 *
 * Simulates a swarm worker: claims its attempt, runs steps S1..Sn, and after
 * each step writes the idempotent effect THEN the durable checkpoint.
 * --die-after-step N --die-before-checkpoint : after writing the step-N
 * effect, SIGKILL self before the checkpoint write — the daemon-restart
 * scenario (process gone, effect happened, no checkpoint).
 *
 * Usage:
 *   node worker.js --dir <storeDir> --attempt <id> --run <runId>
 *     --mission <missionId> --worker <name> --steps S1,S2,S3,S4
 *     --lease-ttl-ms 1500 [--die-after-step 3 --die-before-checkpoint]
 *
 * Prints a JSON summary to stdout. Exits 0 on clean completion.
 */
'use strict';

const store = require('./durable-checkpoint-store');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1];
}
function flag(name) { return process.argv.includes(`--${name}`); }

function main() {
  const storeDir = arg('dir');
  const attemptId = arg('attempt');
  const runId = arg('run');
  const missionId = arg('mission');
  const workerName = arg('worker', 'worker');
  const steps = (arg('steps', 'S1,S2,S3,S4') || '').split(',').filter(Boolean);
  const leaseTtlMs = parseInt(arg('lease-ttl-ms', '1500'), 10);
  const dieAfterStep = arg('die-after-step', null);
  const dieBeforeCheckpoint = flag('die-before-checkpoint');

  // Claim: created -> claimed -> running (edge names mirror attempt-fencing.ts).
  let row = store.casAttempt(storeDir, attemptId, store.readAttempt(storeDir, attemptId).fencing_token,
    (r) => ({ ...r, status: 'claimed', owner: workerName }));
  const token = row.fencing_token;
  const now = Date.now();
  row = store.casAttempt(storeDir, attemptId, token, (r) => ({
    ...r,
    status: 'running',
    lease_until: new Date(now + leaseTtlMs).toISOString(),
  }));

  const summary = { attempt: attemptId, steps_done: [], checkpoints: [], died: false };
  steps.forEach((stepId, idx) => {
    const seq = idx + 1;
    const idemKey = `${runId}:${stepId}`;
    const eff = store.appendEffect(storeDir, idemKey, {
      step_id: stepId, run_id: runId, attempt_id: attemptId, by: workerName,
    });
    summary.steps_done.push({ step: stepId, effect_duplicate: eff.duplicate });
    if (dieAfterStep === stepId && dieBeforeCheckpoint) {
      // Daemon restart: die AFTER the effect, BEFORE the checkpoint write.
      summary.died = true;
      process.stdout.write(JSON.stringify(summary) + '\n');
      process.kill(process.pid, 'SIGKILL');
      return; // unreachable
    }
    // payloadRef is a canonical 005 payload ref (scheme:opaque, no inline state).
    const cp = store.writeCheckpoint(storeDir, attemptId, token, {
      stepId, seq,
      channelVersions: { step: seq },
      payloadRef: `idem:${runId}-${stepId}`,
    });
    summary.checkpoints.push(cp.checkpoint_id);
  });

  store.casAttempt(storeDir, attemptId, token, (r) => ({ ...r, status: 'completed' }));
  process.stdout.write(JSON.stringify(summary) + '\n');
}

main();
