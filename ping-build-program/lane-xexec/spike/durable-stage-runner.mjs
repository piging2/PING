// durable-stage-runner.mjs
// Minimal durable-execution semantics harvested from Temporal + Trigger.dev,
// implemented natively (zero vendor dependencies, node stdlib only).
// NOT wired into any repo. Lane X spike. No em dashes.

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function sha256Hex(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return createHash('sha256').update(s).digest('hex');
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function fullJitterDelay(initialMs, backoff, attempt, maxIntervalMs) {
  const cap = Math.min(initialMs * Math.pow(backoff, attempt - 1), maxIntervalMs);
  return Math.floor(Math.random() * cap);
}

// --- Append-only checkpoint ledger (JSONL). PING-owned, rebuildable from events.
export class CheckpointLedger {
  constructor(path) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, '');
  }
  append(record) {
    appendFileSync(this.path, JSON.stringify(record) + '\n');
  }
  readAll() {
    const raw = readFileSync(this.path, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map((l) => JSON.parse(l));
  }
  forRun(runId) {
    return this.readAll().filter((r) => r.run_id === runId);
  }
}

// --- Idempotency store: (stage_name, input_digest) -> output digest. TTL honored.
export class IdempotencyStore {
  constructor(ttlMsDefault = 24 * 3600 * 1000) {
    this.ttlDefault = ttlMsDefault;
    this.map = new Map(); // key -> { outputDigest, output, expiresAt }
  }
  key(stageName, inputDigest) { return stageName + ':' + inputDigest; }
  get(stageName, inputDigest, now) {
    const e = this.map.get(this.key(stageName, inputDigest));
    if (!e) return null;
    if (e.expiresAt <= now) { this.map.delete(this.key(stageName, inputDigest)); return null; }
    return e;
  }
  set(stageName, inputDigest, output, outputDigest, now, ttlMs) {
    this.map.set(this.key(stageName, inputDigest), {
      outputDigest, output, expiresAt: now + (ttlMs ?? this.ttlDefault),
    });
  }
}

const KILL = Symbol('kill'); // simulated process death mid-stage

export class DurableStageRunner {
  /**
   * stages: [{ name, fn(ctx, input) -> output, policy: {maxAttempts, initialMs, backoff, maxIntervalMs, nonRetryable: [classes], idempotencyTTLms}, timeouts: {startToCloseMs, heartbeatTimeoutMs} }]
   * opts: { ledgerPath, outputPath, now: () => ms, onEvent(record) }
   */
  constructor(stages, opts = {}) {
    this.stages = stages;
    this.ledger = new CheckpointLedger(opts.ledgerPath || './checkpoint-ledger.jsonl');
    this.outputPath = opts.outputPath || (opts.ledgerPath || './checkpoint-ledger.jsonl') + '.outputs.jsonl';
    if (!existsSync(this.outputPath)) writeFileSync(this.outputPath, '');
    this.outputsByDigest = new Map(); // output_digest -> output (cross-process resume + idempotency)
    this.idemByStageInput = new Map(); // stage:input_digest -> {outputDigest, expiresAt}
    this._loadOutputs();
    this.idem = new IdempotencyStore();
    this.now = opts.now || (() => Date.now());
    this.onEvent = opts.onEvent || (() => {});
    this.gateWaiters = new Map(); // runId:stage -> { resolve, deadlineAt, name }
  }

  _loadOutputs() {
    const raw = readFileSync(this.outputPath, 'utf8').trim();
    if (!raw) return;
    for (const line of raw.split('\n')) {
      const r = JSON.parse(line);
      if (r.kind !== 'stage-output') continue;
      this.outputsByDigest.set(r.output_digest, r.output);
      this.idemByStageInput.set(r.stage + ':' + r.input_digest, { outputDigest: r.output_digest, expiresAt: r.expires_at });
    }
  }

  _saveOutput(stageName, inputDigest, output, outputDigest, ttlMs) {
    const rec = {
      kind: 'stage-output', stage: stageName, input_digest: inputDigest,
      output_digest: outputDigest, output, expires_at: this.now() + (ttlMs ?? 24 * 3600 * 1000),
    };
    appendFileSync(this.outputPath, JSON.stringify(rec) + '\n');
    this.outputsByDigest.set(outputDigest, output);
    this.idemByStageInput.set(stageName + ':' + inputDigest, { outputDigest, expiresAt: rec.expires_at });
  }

  _idemHit(stageName, inputDigest) {
    const e = this.idemByStageInput.get(stageName + ':' + inputDigest);
    if (!e) return null;
    if (e.expiresAt <= this.now()) { this.idemByStageInput.delete(stageName + ':' + inputDigest); return null; }
    const output = this.outputsByDigest.get(e.outputDigest);
    if (output === undefined) return null;
    return { outputDigest: e.outputDigest, output };
  }

  emit(type, fields) {
    this.onEvent({ type, at: new Date(this.now()).toISOString(), ...fields });
  }

  // Verify digest chain for a run; returns index of first stage to (re)run.
  resumePlan(runId, runInputDigest) {
    const recs = this.ledger.forRun(runId);
    const done = new Map(); // stageIndex -> COMPLETED record
    for (const r of recs) {
      if (r.state === 'COMPLETED') done.set(r.stage_index, r);
    }
    let expectedInput = runInputDigest;
    for (let i = 0; i < this.stages.length; i++) {
      const c = done.get(i);
      if (!c) return { fromStage: i, reason: 'no-completed-checkpoint', inputDigestForStage: expectedInput, integrityViolation: false };
      // Liar / corruption check: input digest must chain from previous output.
      if (c.input_digest !== expectedInput) {
        return { fromStage: i, reason: 'input-digest-mismatch', expected: expectedInput, got: c.input_digest, inputDigestForStage: expectedInput, integrityViolation: true };
      }
      if (!c.output_digest || typeof c.output_digest !== 'string' || c.output_digest.length !== 64) {
        return { fromStage: i, reason: 'missing-or-malformed-output-digest', inputDigestForStage: expectedInput, integrityViolation: true };
      }
      expectedInput = c.output_digest;
    }
    return { fromStage: this.stages.length, reason: 'all-complete', inputDigestForStage: expectedInput };
  }

  async runStage(runId, stageIndex, input, inputDigest, opts = {}) {
    const stage = this.stages[stageIndex];
    const policy = Object.assign(
      { maxAttempts: 3, initialMs: 100, backoff: 2, maxIntervalMs: 2000, nonRetryable: [], idempotencyTTLms: undefined },
      stage.policy || {}
    );
    const timeouts = Object.assign(
      { startToCloseMs: 30000, heartbeatTimeoutMs: 10000, heartbeatEveryMs: 1000 },
      stage.timeouts || {}
    );
    const now = this.now();

    // Idempotency: same stage + same input digest -> skip execution, return recorded output.
    // Cross-process: the persistent output store survives runner restarts.
    // Fail-closed: if this stage's checkpoint was rejected for an integrity violation,
    // the output store is distrusted for this stage and it is re-executed.
    const hit = opts.forceReexecute ? null : this._idemHit(stage.name, inputDigest);
    if (hit) {
      this.emit('STAGE_IDEMPOTENT_SKIP', { run_id: runId, stage: stage.name, output_digest: hit.outputDigest });
      return { output: hit.output, outputDigest: hit.outputDigest, skipped: true };
    }

    let attempt = 0;
    let lastHeartbeatDetails = null;
    while (attempt < policy.maxAttempts) {
      attempt += 1;
      const attemptId = runId + ':' + stage.name + '#a' + attempt;
      this.ledger.append({
        run_id: runId, stage_index: stageIndex, stage: stage.name,
        state: 'STARTED', attempt, input_digest: inputDigest,
        started_at: new Date(now).toISOString(),
        heartbeat_details: lastHeartbeatDetails,
      });
      this.emit('ATTEMPT_START', { run_id: runId, stage: stage.name, attempt, resumed_from_heartbeat: !!lastHeartbeatDetails });

      let lastHeartbeatAt = this.now();
      let leaseAlive = true;

      const ctx = {
        attempt,
        runId,
        heartbeat: (details) => {
          lastHeartbeatDetails = details;
          lastHeartbeatAt = this.now();
          this.emit('HEARTBEAT', { run_id: runId, stage: stage.name, attempt, details });
        },
        awaitSignal: (name, deadlineMs) => new Promise((resolve) => {
          const key = runId + ':' + stageIndex;
          const deadlineAt = this.now() + deadlineMs;
          this.gateWaiters.set(key, { resolve, deadlineAt, name });
          this.emit('GATE_PARKED', { run_id: runId, stage: stage.name, signal: name, deadline_ms: deadlineMs });
        }),
        clockNow: this.now,
      };

      const work = (async () => stage.fn(ctx, input))();
      const timeout = sleep(timeouts.startToCloseMs).then(() => {
        const e = new Error('start-to-close timeout');
        e.errorClass = 'TIMEOUT'; e.retryable = true;
        throw e;
      });
      // Heartbeat watchdog: if the worker stops heartbeating mid-attempt, fail fast.
      const watchdog = (async () => {
        while (leaseAlive) {
          await sleep(Math.min(timeouts.heartbeatTimeoutMs, 500));
          if (!leaseAlive) return;
          if (this.now() - lastHeartbeatAt > timeouts.heartbeatTimeoutMs) {
            const e = new Error('heartbeat timeout: worker appears dead');
            e.errorClass = 'HEARTBEAT_TIMEOUT'; e.retryable = true;
            throw e;
          }
        }
      })();

      try {
        const output = await Promise.race([work, timeout, watchdog]);
        leaseAlive = false;
        const outputDigest = sha256Hex(output);
        this.ledger.append({
          run_id: runId, stage_index: stageIndex, stage: stage.name,
          state: 'COMPLETED', attempt, input_digest: inputDigest, output_digest: outputDigest,
          finished_at: new Date(this.now()).toISOString(),
        });
        this.idem.set(stage.name, inputDigest, output, outputDigest, this.now(), policy.idempotencyTTLms);
        this._saveOutput(stage.name, inputDigest, output, outputDigest, policy.idempotencyTTLms);
        this.emit('STAGE_COMPLETED', { run_id: runId, stage: stage.name, attempt, output_digest: outputDigest });
        return { output, outputDigest, skipped: false };
      } catch (err) {
        leaseAlive = false;
        if (err === KILL || err?.code === 'SIMULATED_KILL') {
          // Process died mid-stage: no FAILED record, no output digest. Resume will
          // re-run from this stage's STARTED checkpoint (which has no COMPLETED).
          this.emit('WORKER_KILLED', { run_id: runId, stage: stage.name, attempt });
          throw err;
        }
        const errorClass = err.errorClass || 'TRANSIENT';
        const nonRetryable = policy.nonRetryable.includes(errorClass) || err.retryable === false;
        // Poison-pill / liar containment: non-retryable -> quarantine, no more attempts.
        if (nonRetryable) {
          this.ledger.append({
            run_id: runId, stage_index: stageIndex, stage: stage.name,
            state: 'QUARANTINED', attempt, input_digest: inputDigest,
            error_class: errorClass, error: String(err && err.message || err),
            finished_at: new Date(this.now()).toISOString(),
          });
          this.emit('STAGE_QUARANTINED', { run_id: runId, stage: stage.name, error_class: errorClass });
          const q = new Error('stage quarantined: ' + errorClass);
          q.quarantined = true; q.errorClass = errorClass;
          throw q;
        }
        if (attempt >= policy.maxAttempts) {
          this.ledger.append({
            run_id: runId, stage_index: stageIndex, stage: stage.name,
            state: 'DEAD', attempt, input_digest: inputDigest,
            error_class: errorClass, error: String(err && err.message || err),
            finished_at: new Date(this.now()).toISOString(),
          });
          this.emit('STAGE_DEAD', { run_id: runId, stage: stage.name, attempts: attempt, error_class: errorClass });
          const d = new Error('stage dead after ' + attempt + ' attempts: ' + errorClass);
          d.dead = true; d.errorClass = errorClass;
          throw d;
        }
        const delay = fullJitterDelay(policy.initialMs, policy.backoff, attempt, policy.maxIntervalMs);
        this.emit('ATTEMPT_RETRY', { run_id: runId, stage: stage.name, attempt, next_attempt_in_ms: delay, error_class: errorClass });
        await sleep(delay);
      }
    }
    throw new Error('unreachable');
  }

  signal(runId, stageIndex, payload) {
    const key = runId + ':' + stageIndex;
    const w = this.gateWaiters.get(key);
    if (!w) return false;
    this.gateWaiters.delete(key);
    this.emit('GATE_SIGNALED', { run_id: runId, signal: w.name, late: this.now() > w.deadlineAt });
    w.resolve({ approved: payload?.approved ?? true, payload, at: new Date(this.now()).toISOString() });
    return true;
  }

  // Sweep parked gates whose deadline passed: escalate, do NOT hold scheduler slots.
  sweepGates() {
    const now = this.now();
    for (const [key, w] of this.gateWaiters.entries()) {
      if (now > w.deadlineAt) {
        this.gateWaiters.delete(key);
        const [runId, stageIndex] = key.split(':');
        this.emit('GATE_EXPIRED', { run_id: runId, stage_index: Number(stageIndex), signal: w.name });
        w.resolve({ approved: false, expired: true, at: new Date(now).toISOString() });
      }
    }
  }

  async run(runId, runInput) {
    const runInputDigest = sha256Hex(runInput);
    const plan = this.resumePlan(runId, runInputDigest);
    this.emit('RUN_START', { run_id: runId, resume_from_stage: plan.fromStage, reason: plan.reason, input_digest: runInputDigest });
    let fromStage = plan.fromStage;
    let input;
    let inputDigest;
    if (fromStage === 0 || fromStage >= this.stages.length) {
      input = runInput;
      inputDigest = runInputDigest;
    } else {
      // Resume needs the previous stage's OUTPUT, not just its digest.
      // Outputs are content-addressed in the persistent output store.
      inputDigest = plan.inputDigestForStage;
      input = this.outputsByDigest.get(inputDigest);
      if (input === undefined) {
        this.emit('RESUME_OUTPUT_MISSING', { run_id: runId, resume_from_stage: fromStage, missing_digest: inputDigest });
        fromStage = 0; // honest fallback: rebuild from scratch, recorded
        input = runInput;
        inputDigest = runInputDigest;
      } else {
        this.emit('RESUME_INPUT_LOADED', { run_id: runId, resume_from_stage: fromStage, input_digest: inputDigest });
      }
    }
    for (let i = fromStage; i < this.stages.length; i++) {
      const forceReexecute = plan.integrityViolation && i === fromStage;
      if (forceReexecute) this.emit('STAGE_FORCE_REEXECUTE', { run_id: runId, stage: this.stages[i].name, reason: plan.reason });
      const { output, outputDigest } = await this.runStage(runId, i, input, inputDigest, { forceReexecute });
      input = output;
      inputDigest = outputDigest;
    }
    this.emit('RUN_COMPLETED', { run_id: runId, final_digest: inputDigest });
    return { runId, finalDigest: inputDigest, output: input };
  }
}

export { KILL };
