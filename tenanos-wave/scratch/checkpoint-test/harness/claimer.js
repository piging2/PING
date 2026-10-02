/**
 * Claimer / discoverer / resumer child process for the durable checkpoint test.
 *
 * Modes:
 *   --discover-only   : print discoverOrphans(storeDir) JSON and exit.
 *   (default)         : attempt claimOrphan(); print {won,...} JSON and exit.
 *   --resume          : if the claim is won, resume from the latest durable
 *                       checkpoint: re-execute the last checkpointed step and
 *                       all following steps with idempotent effects, write
 *                       the missing checkpoints with the NEW fencing token,
 *                       mark the attempt completed. Print resume JSON.
 *
 * Resume is idempotent by construction: every step carries idem key
 * <runId>:<stepId>; already-logged effects are no-ops (no duplicate effects).
 *
 * Usage:
 *   node claimer.js --dir <storeDir> --attempt <id> --claimer c1 [--resume --steps S1,S2,S3,S4 --worker <name>]
 */
'use strict';

const fs = require('fs');
const store = require('./durable-checkpoint-store');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1];
}
function flag(name) { return process.argv.includes(`--${name}`); }

function main() {
  const storeDir = arg('dir');
  const attemptId = arg('attempt');
  const claimerId = arg('claimer', 'claimer');

  if (flag('discover-only')) {
    const orphans = store.discoverOrphans(storeDir, Date.now());
    process.stdout.write(JSON.stringify({ orphans }) + '\n');
    return;
  }

  const claim = store.claimOrphan(storeDir, attemptId, claimerId, Date.now());
  const out = { claimer: claimerId, ...claim };

  if (claim.won && flag('resume')) {
    const steps = (arg('steps', '') || '').split(',').filter(Boolean);
    const workerName = arg('worker', claimerId);
    const token = claim.fencing_token;
    // Move claimed -> running with a fresh lease (edge names mirror attempt-fencing.ts).
    let row = store.casAttempt(storeDir, attemptId, token, (r) => ({
      ...r, status: 'running', lease_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }));
    const latest = store.readLatestCheckpoint(storeDir, attemptId);
    const resumeFromSeq = latest ? latest.step_seq : 0;
    const seen = [];
    for (let s = 1; s <= resumeFromSeq; s++) {
      const f = store.checkpointFile(storeDir, attemptId, s);
      if (fs.existsSync(f)) seen.push(JSON.parse(fs.readFileSync(f, 'utf8')).checkpoint_id);
    }
    // Resume re-executes the last checkpointed step AND everything after it.
    // Effects are idempotent (idem key); only steps beyond the checkpoint get
    // NEW checkpoint seqs — (attempt_id, seq) is the PK, history is never
    // rewritten (A-4).
    const resumeLog = [];
    let seq = resumeFromSeq;
    const startIdx = resumeFromSeq > 0 ? resumeFromSeq - 1 : 0;
    for (let i = startIdx; i < steps.length; i++) {
      const stepId = steps[i];
      const idemKey = `${row.run_id}:${stepId}`;
      const eff = store.appendEffect(storeDir, idemKey, {
        step_id: stepId, run_id: row.run_id, attempt_id: attemptId, by: workerName,
      });
      let cpId = null;
      if (i >= resumeFromSeq) {
        seq += 1;
        const cp = store.writeCheckpoint(storeDir, attemptId, token, {
          stepId, seq,
          channelVersions: { step: seq },
          versionsSeen: [...seen],
          payloadRef: `effects.jsonl#${idemKey}`,
        });
        seen.push(cp.checkpoint_id);
        cpId = cp.checkpoint_id;
      }
      resumeLog.push({ step: stepId, effect_duplicate: eff.duplicate, checkpoint: cpId });
    }
    store.casAttempt(storeDir, attemptId, token, (r) => ({ ...r, status: 'completed' }));
    out.resume = { resumed_from_seq: resumeFromSeq, steps: resumeLog, final_seq: seq };
  }

  process.stdout.write(JSON.stringify(out) + '\n');
}

main();
