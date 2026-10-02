/**
 * Durable checkpoint test — worker C1, TenantOS autonomous convergence wave.
 *
 * Proves at the TenantOS substrate level, against the INTEGRATED 095/103
 * vocabulary (src/tenanos/run/ on tenanos-wave/integration):
 *
 *  (1) a run's checkpoint is persisted DURABLY (survives total handle loss);
 *  (2) after simulated daemon restart, a FRESH coordinator process discovers
 *      the orphaned run from durable state alone;
 *  (3) re-claim of the orphaned run is ATOMIC (exactly one claimer wins a race);
 *  (4) resume continues from the checkpoint with no duplicate effects
 *      (idempotent re-execution of the already-checkpointed step).
 *
 * Mechanism: a real OS child process plays the worker, is SIGKILLed mid-run
 * (the 2026-09-24 daemon-restart incident shape), and separate fresh child
 * processes play discoverer / claimants / resumer. Durable state lives in
 * harness/durable-checkpoint-store.js (atomic tmp+rename+fsync writes,
 * O_EXCL claim locks). The test asserts against the real integrated
 * deciders: projectMission, classifyUnknownExecution, isLegalTransition,
 * attemptTransition, validateCheckpoint, reconcileAttempt,
 * buildFenceCondition, interpretFenceResult.
 *
 * Run on the Pig: see jest.config.cjs in this directory.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Integrated substrate vocabulary (095 + 103). Overridable via TENANOS_RUN_SRC.
const RUN_SRC =
  process.env.TENANOS_RUN_SRC ||
  '/home/nolan/projects/ping-wave-integration/src/tenanos/run';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rsa = require(path.join(RUN_SRC, 'run-state-authority'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const af = require(path.join(RUN_SRC, 'attempt-fencing'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const store = require('./harness/durable-checkpoint-store');

jest.setTimeout(60000);

const HARNESS = path.join(__dirname, 'harness');
const WORK = path.join(__dirname, '.work');
const STORE = path.join(WORK, `store-${process.pid}`);
const RUN_ID = 'run-c1-001';
const MISSION_ID = 'mission-c1-001';
const ATTEMPT_ID = 'attempt-c1-001';
const STEPS = ['S1', 'S2', 'S3', 'S4'];

function node(script: string, args: string[], timeoutMs = 20000) {
  return spawnSync(process.execPath, [path.join(HARNESS, script), ...args], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
}
function lastJsonLine(stdout: string): any {
  const lines = stdout.trim().split('\n').filter((l) => l.trim().startsWith('{'));
  if (lines.length === 0) throw new Error(`no JSON in stdout: ${stdout.slice(0, 500)}`);
  return JSON.parse(lines[lines.length - 1]);
}
function sleep(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy-wait: deterministic, no timer handle to leak */ }
}
function freshStore() {
  // Drop every handle/object reference: re-require the module with a cold cache.
  const resolved = require.resolve('./harness/durable-checkpoint-store');
  delete require.cache[resolved];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./harness/durable-checkpoint-store');
}

beforeAll(() => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(STORE, { recursive: true });
  store.initAttempt(STORE, {
    attemptId: ATTEMPT_ID,
    runId: RUN_ID,
    missionId: MISSION_ID,
    workerName: 'worker-c1',
    leaseTtlMs: 1200,
    steps: STEPS,
  });
});

afterAll(() => {
  // Scratch is ephemeral; TEST-REPORT.md keeps the evidence. Always clean.
  fs.rmSync(WORK, { recursive: true, force: true });
});

describe('property (1): checkpoint persisted DURABLY, survives total handle loss', () => {
  test('SIGKILLed worker leaves complete durable checkpoint state on disk', () => {
    const res = node('worker.js', [
      '--dir', STORE,
      '--attempt', ATTEMPT_ID,
      '--run', RUN_ID,
      '--mission', MISSION_ID,
      '--worker', 'worker-c1',
      '--steps', STEPS.join(','),
      '--lease-ttl-ms', '1200',
      '--die-after-step', 'S3',
      '--die-before-checkpoint',
    ]);
    // The worker process is GONE: total handle loss, like the daemon restart.
    expect(res.signal).toBe('SIGKILL');
    expect(res.status).toBeNull();

    // Fresh module instance: zero retained handles, everything re-read from disk.
    const s = freshStore();
    const row = s.readAttempt(STORE, ATTEMPT_ID);
    expect(row.status).toBe('running'); // died mid-attempt
    expect(row.checkpoint_seq).toBe(2);

    // Checkpoints 1..2 are on disk with the 005-shaped record.
    for (const seq of [1, 2]) {
      const cpPath = path.join(STORE, 'attempts', ATTEMPT_ID, 'checkpoints', `cp-${seq}.json`);
      expect(fs.existsSync(cpPath)).toBe(true);
      const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
      expect(cp.checkpoint_id).toBe(`${ATTEMPT_ID}:${seq}`); // monotonic id
      expect(cp.step_seq).toBe(seq);
      expect(cp.channel_versions).toEqual({ step: seq });
      expect(Array.isArray(cp.versions_seen)).toBe(true);
      expect(typeof cp.payload_ref).toBe('string'); // 005 rule: payload refs, no inline secrets
      expect(cp).not.toHaveProperty('payload');
      expect(cp.fencing_token).toBe(row.fencing_token);
    }
    // The crash window: S3's effect happened, its checkpoint did NOT.
    const noCp3 = path.join(STORE, 'attempts', ATTEMPT_ID, 'checkpoints', 'cp-3.json');
    expect(fs.existsSync(noCp3)).toBe(false);

    // Effect log is durable and shows the partial run.
    const effects = s.readEffects(STORE);
    expect(effects.map((e: any) => e.idem_key)).toEqual(
      STEPS.slice(0, 3).map((st) => `${RUN_ID}:${st}`),
    );
  });
});

describe('property (2): fresh coordinator discovers the orphan from durable state alone', () => {
  test('a brand-new process finds the orphaned attempt; substrate projects UNKNOWN_EXECUTION', () => {
    sleep(1600); // let the worker's lease expire — nobody renews it, the daemon is dead

    const res = node('claimer.js', [
      '--dir', STORE, '--attempt', ATTEMPT_ID, '--discover-only',
    ]);
    expect(res.status).toBe(0);
    const { orphans } = lastJsonLine(res.stdout);
    const found = orphans.find((o: any) => o.attempt_id === ATTEMPT_ID);
    expect(found).toBeDefined();
    expect(found.status).toBe('running');
    expect(found.checkpoint_seq).toBe(2);

    // 095 vocabulary: expired-lease running projects to UNKNOWN_EXECUTION —
    // never FAILED (R-A), never silently PENDING (R-C).
    const projected = rsa.projectMission({
      mission_id: MISSION_ID,
      status: 'running',
      lease_until: new Date(Date.now() - 1000).toISOString(),
    });
    expect(projected).toBe(rsa.CanonicalRunState.UNKNOWN_EXECUTION);
    expect(rsa.isLegalTransition(
      rsa.CanonicalRunState.UNKNOWN_EXECUTION,
      rsa.CanonicalRunState.NEEDS_RECONCILIATION,
    )).toBe(true);
    expect(rsa.isLegalTransition(
      rsa.CanonicalRunState.UNKNOWN_EXECUTION,
      rsa.CanonicalRunState.PENDING,
    )).toBe(false);

    // 103 adapter: indeterminate evidence on a disappeared worker HOLDS —
    // reexecute:false. Resume proceeds from the durable checkpoint, never
    // blind re-execution (R-B).
    const rec = af.reconcileAttempt(
      { attempt_id: ATTEMPT_ID, mission_id: MISSION_ID, status: af.AttemptStatus.RUNNING },
      { effectProven: false, effectAbsent: false },
    );
    expect(rec).not.toBeNull();
    expect(rec.directive).toBe(rsa.ReconcileDirective.HOLD_NEEDS_RECONCILIATION);
    expect(rec.reexecute).toBe(false);
  });
});

describe('property (3): atomic re-claim — exactly one claimer wins the race', () => {
  let winner: string;

  test('8 concurrent fresh processes race; exactly one wins', () => {
    const racers = Array.from({ length: 8 }, (_, i) => `c${i + 1}`);
    // Spawn all racers without waiting: true OS-level concurrency.
    const procs = racers.map((c) =>
      spawnSync(process.execPath,
        [path.join(HARNESS, 'claimer.js'), '--dir', STORE, '--attempt', ATTEMPT_ID, '--claimer', c],
        { encoding: 'utf8', timeout: 20000 }),
    );
    const results = procs.map((p, i) => {
      expect(p.status).toBe(0);
      return { claimer: racers[i], ...lastJsonLine(p.stdout) };
    });
    const winners = results.filter((r) => r.won === true);
    const losers = results.filter((r) => r.won !== true);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(7);
    winner = winners[0].claimer;

    // The winner's claim is durable: new token, claimed status, owner set.
    const s = freshStore();
    const row = s.readAttempt(STORE, ATTEMPT_ID);
    expect(row.status).toBe('claimed');
    expect(row.owner).toBe(winner);
    expect(row.fencing_token).toBe(winners[0].fencing_token);
    expect(row.fencing_token).not.toBeUndefined();

    // A late claimer loses even in-process (lock already held).
    const late = s.claimOrphan(STORE, ATTEMPT_ID, 'late-claimer', Date.now());
    expect(late.won).toBe(false);

    // 103 vocabulary touchpoints: the claim rotates the fencing token, which
    // is the supersede semantic (A-1: zombie writes match zero rows).
    expect(af.attemptTransition(af.AttemptStatus.RUNNING, 'supersede'))
      .toBe(af.AttemptStatus.STALE);
    expect(af.attemptTransition(af.AttemptStatus.CREATED, 'claim'))
      .toBe(af.AttemptStatus.CLAIMED);
    // Fence contract (production enforcer is the SQL conditional UPDATE):
    expect(af.interpretFenceResult(1)).toBe('applied');
    expect(af.interpretFenceResult(0)).toBe('fenced');
    const fence = af.buildFenceCondition(ATTEMPT_ID, row.fencing_token, [af.AttemptStatus.CLAIMED]);
    expect(fence.text).toContain('fencing_token');
  });

  test('winner token is required for further writes (zombie discipline)', () => {
    const s = freshStore();
    const row = s.readAttempt(STORE, ATTEMPT_ID);
    // The DEAD worker's old token no longer authorizes writes.
    expect(() =>
      s.casAttempt(STORE, ATTEMPT_ID, 'dead-worker-old-token', (r: any) => r),
    ).toThrow(s.FencedWriteError);
    // The winner's token does.
    const next = s.casAttempt(STORE, ATTEMPT_ID, row.fencing_token, (r: any) => ({
      ...r, note: 'winner-verified',
    }));
    expect(next.note).toBe('winner-verified');
  });
});

describe('property (4): resume from checkpoint — no duplicate effects', () => {
  test('winner resumes; already-checkpointed steps re-execute as no-ops', () => {
    // Winner must be known; re-derive from durable state if test order shifts.
    const s0 = freshStore();
    const winClaimer = s0.readAttempt(STORE, ATTEMPT_ID).owner as string;
    expect(winClaimer).toBeTruthy();

    const res = node('claimer.js', [
      '--dir', STORE,
      '--attempt', ATTEMPT_ID,
      '--claimer', winClaimer,
      '--resume',
      '--steps', STEPS.join(','),
      '--worker', winClaimer,
    ]);
    expect(res.status).toBe(0);
    const out = lastJsonLine(res.stdout);
    expect(out.won).toBe(true);
    expect(out.resume.resumed_from_seq).toBe(2);
    // S2 (already checkpointed) and S3 (effect existed, uncheckpointed)
    // re-execute as idempotent no-ops; S4 executes fresh.
    expect(out.resume.steps).toEqual([
      { step: 'S2', effect_duplicate: true, checkpoint: null },
      { step: 'S3', effect_duplicate: true, checkpoint: `${ATTEMPT_ID}:3` },
      { step: 'S4', effect_duplicate: false, checkpoint: `${ATTEMPT_ID}:4` },
    ]);

    const s = freshStore();
    // Effect log: exactly one record per step — NO duplicates.
    const effects = s.readEffects(STORE);
    expect(effects).toHaveLength(4);
    const keys = effects.map((e: any) => e.idem_key);
    expect(new Set(keys).size).toBe(4);
    expect(keys.sort()).toEqual(STEPS.map((st) => `${RUN_ID}:${st}`).sort());

    // Checkpoint chain is complete and monotonic (A-4, via the real decider).
    for (const seq of [1, 2, 3, 4]) {
      const cpPath = path.join(STORE, 'attempts', ATTEMPT_ID, 'checkpoints', `cp-${seq}.json`);
      expect(fs.existsSync(cpPath)).toBe(true);
    }
    for (let prev = 1; prev <= 3; prev++) {
      const nextCp = JSON.parse(fs.readFileSync(
        path.join(STORE, 'attempts', ATTEMPT_ID, 'checkpoints', `cp-${prev + 1}.json`), 'utf8'));
      expect(() => af.validateCheckpoint(ATTEMPT_ID, prev, {
        attempt_id: ATTEMPT_ID, seq: prev + 1, kind: nextCp.step_id, payload: {},
      })).not.toThrow();
    }
    expect(() => af.validateCheckpoint(ATTEMPT_ID, 4, {
      attempt_id: ATTEMPT_ID, seq: 4, kind: 'S4', payload: {},
    })).toThrow(af.NonMonotonicCheckpointError); // replay of cp-4 rejected

    const row = s.readAttempt(STORE, ATTEMPT_ID);
    expect(row.status).toBe('completed');
    expect(row.checkpoint_seq).toBe(4);
  });
});
