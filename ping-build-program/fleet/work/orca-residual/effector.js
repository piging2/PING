/**
 * effector.js — ORCA residual lane (2026-09-24)
 *
 * The worker/adapter side of the contract. In production this wraps the real
 * worker: the two duties below are the ONLY new worker obligations, and both
 * are narrow:
 *
 *   1. WRITE-AHEAD OUTCOME RECORD: when the effect completes, emit
 *      EFFECT_SUCCEEDED to the journal BEFORE returning the result to the
 *      coordinator. The coordinator's receipt is unreliable (T2); the
 *      journal record is the durable truth the reconciler recovers from.
 *   2. EXECUTED-OP LOG + PROBE: keep a durable set of executed op_keys with
 *      their results. probe(opKey) answers {executed:true,result} /
 *      {executed:false} / {executed:'unknown'}. In T2's world the drop file
 *      on disk IS this log; this module formalizes it instead of leaving
 *      the drop as an accident the coordinator then discards.
 *
 * IDEMPOTENT EXECUTION: execute() checks the log first. A duplicate dispatch
 * of an already-executed op_key returns the recorded result WITHOUT
 * re-running the effect. The effect counter in the chaos harness is the
 * falsification instrument: any scenario that drives it to 2 for one op_key
 * falsifies the invariant.
 */
'use strict';
const { deriveInputDigest } = require('./idempotency');

class Effector {
  /**
   * @param {object} options
   * @param {object} options.journal — event journal (for write-ahead EFFECT_SUCCEEDED)
   * @param {object} options.faults — fault injection:
   *   { dieBeforeReceipt:bool, persistFailOnSuccess:bool, dropResponse:bool,
   *     probeLies:'unknown'|null, loseExecutedLog:bool }
   * @param {string} options.name
   */
  constructor(options = {}) {
    this.journal = options.journal;
    this.faults = options.faults || {};
    this.name = options.name || 'effector';
    // Durable executed-op log: the formalized "drop on disk". File-backed so
    // it survives the worker's death; the coordinator's probe reads THIS,
    // not the dead worker process. (T2's lesson: the drop was always the
    // durable truth; the bug was the coordinator discarding it.)
    this.logFile = options.logFile || null;
    this.executedOps = new Map(); // op_key -> { result, effect, inputDigest } (cache)
    this.effectCount = new Map(); // op_key -> number of ACTUAL effect runs
    this._dead = false;           // dieBeforeReceipt: worker dead, cannot return results
    if (this.logFile) {
      const fs = require('fs'), path = require('path');
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      if (fs.existsSync(this.logFile)) fs.unlinkSync(this.logFile);
    }
  }

  _readLog() {
    const found = new Map();
    if (!this.logFile) return found;
    const fs = require('fs');
    if (!fs.existsSync(this.logFile)) return found;
    for (const line of fs.readFileSync(this.logFile, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); found.set(r.op_key, r); } catch (_) {}
    }
    return found;
  }

  /**
   * Execute one logical operation exactly once per op_key.
   * @returns {Promise<{result, duplicate:boolean}>}
   */
  async execute({ opKey, missionId, effect, input, attempt = 1, consequence = 'high', correlationId }) {
    const legacy = !!this.faults.legacyWorker;
    // Idempotency gate: already executed -> return recorded result, do NOT re-run.
    // (Legacy pre-fix workers have no gate: every dispatch re-runs the effect.)
    // The gate consults the DURABLE log, so it holds across worker restarts.
    if (!legacy) {
      const prior = this.executedOps.get(opKey) || this._readLog().get(opKey);
      if (prior) {
        this.executedOps.set(opKey, prior);
        return { result: prior.result, duplicate: true };
      }
    }
    // --- THE CONSEQUENTIAL EFFECT (counted; the falsification instrument) ---
    this.effectCount.set(opKey, (this.effectCount.get(opKey) || 0) + 1);
    const result = { effect, missionId, output: `output-of(${effect})`, inputDigest: deriveInputDigest(input) };

    // Durable executed-op log (the formalized "drop on disk"): written to the
    // shared durable file BEFORE the write-ahead event, so it survives both
    // result-persistence failure and the worker's own death.
    if (!legacy && !this.faults.loseExecutedLog) {
      const entry = { op_key: opKey, result, effect, inputDigest: result.inputDigest };
      this.executedOps.set(opKey, entry);
      if (this.logFile) {
        require('fs').appendFileSync(this.logFile, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n');
      }
    }

    // WRITE-AHEAD: EFFECT_SUCCEEDED before returning to the coordinator.
    // logical_id makes re-emission idempotent at the event layer.
    if (!legacy && this.journal && !this.faults.persistFailOnSuccess) {
      await this.journal.emit('EFFECT_SUCCEEDED', this.name, {
        op_key: opKey, mission_id: missionId, effect, attempt,
        result_digest: result.inputDigest, result,
      }, { logical_id: `succeeded:${opKey}`, correlation_id: correlationId || opKey });
    }

    // Fault: worker dies after the effect, before the coordinator receives.
    if (this.faults.dieBeforeReceipt) {
      this._dead = true;
      const err = new Error('worker died before receipt');
      err.code = 'WORKER_DIED_BEFORE_RECEIPT';
      throw err;
    }
    // Fault: the response channel drops the result (ack lost in transit).
    if (this.faults.dropResponse) {
      const err = new Error('response lost in transit');
      err.code = 'RESPONSE_LOST';
      throw err;
    }
    return { result, duplicate: false };
  }

  /**
   * Reconciliation probe: did this op_key execute?
   *
   * Reads the DURABLE executed-op log (shared storage), not the worker
   * process: a dead worker's in-memory state is gone, but its drop on disk
   * is not. Returns 'unknown' only when the log itself is unavailable.
   */
  async probe(opKey) {
    if (this.faults.legacyWorker) return { executed: 'unknown', reason: 'legacy worker keeps no executed-op log' };
    if (this.faults.probeLies === 'unknown') return { executed: 'unknown', reason: 'probe inconclusive (log unavailable)' };
    const durable = this._readLog();
    const rec = durable.get(opKey) || this.executedOps.get(opKey);
    if (rec) return { executed: true, result: rec.result };
    return { executed: false };
  }

  revive() { this._dead = false; }
  effectsFor(opKey) { return this.effectCount.get(opKey) || 0; }
}

module.exports = { Effector };
