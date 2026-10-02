/**
 * coordinator.js — ORCA residual lane (2026-09-24)
 *
 * Two dispatch loops over the same effector/journal pair:
 *
 *   OldCoordinator — the T2 behavior, kept ONLY as the falsification
 *   control: on worker timeout it builds the "honest failed envelope"
 *   (status failed, assumes the effect did not happen), records
 *   WORKER_FAILED, and auto-retries. This is `timeout -> assume failed ->
 *   retry`, the exact chain proven live on the Pig.
 *
 *   Coordinator — the fix: on worker timeout it emits EFFECT_UNKNOWN
 *   (never assumes failure) and runs reconcile-before-retry:
 *     recovered       -> complete the mission with the recovered result
 *     retry_authorized-> dispatch attempt N+1 under the SAME op_key
 *     held            -> park + escalate, no further dispatch
 *     failed_terminal -> mark failed, no retry
 *
 * Both coordinators share the mission lifecycle shape of the real
 * MissionRuntime (created -> assigned -> running -> completed/failed), so
 * the repair is a behavior change inside the existing authority, not a
 * new one.
 */
'use strict';
const { deriveOpKey } = require('./idempotency');
const { reconcile } = require('./reconciler');

class OldCoordinator {
  // Faithful to orca-dispatch-test/orca_control_loop.js delegate():
  // disp.timedOut -> timeoutEnvelope(status failed) -> recordVerifiedResult
  // -> WORKER_FAILED -> attempt++ re-dispatch. No reconciliation.
  constructor({ journal, effector, maxAttempts = 3, name = 'old-coordinator' }) {
    this.journal = journal;
    this.effector = effector;
    this.maxAttempts = maxAttempts;
    this.name = name;
    this.log = [];
  }

  async runMission({ missionId, effect, input }) {
    const opKey = deriveOpKey({ missionId, effect, input });
    let attempt = 0;
    while (attempt < this.maxAttempts) {
      attempt++;
      this.log.push({ ev: 'dispatch', opKey, attempt, by: this.name });
      try {
        const { result } = await this.effector.execute({ opKey, missionId, effect, input, attempt });
        this.log.push({ ev: 'completed', opKey, attempt });
        return { status: 'completed', result, attempts: attempt, opKey };
      } catch (err) {
        // OLD: timeout (or any worker-side loss) is recorded as failure and retried.
        this.log.push({ ev: 'WORKER_FAILED_assumed', opKey, attempt, error: err.code || err.message });
        await this.journal.emit('MISSION_FAILED', this.name,
          { missionId, error: `dispatcher timeout after attempt ${attempt}; assumed failed`, op_key: opKey },
          { correlation_id: opKey });
      }
    }
    return { status: 'failed', attempts: attempt, opKey };
  }
}

class Coordinator {
  constructor({ journal, effector, maxAttempts = 3, consequence = 'high', name = 'coordinator' }) {
    this.journal = journal;
    this.effector = effector;
    this.maxAttempts = maxAttempts;
    this.consequence = consequence;
    this.name = name;
    this.log = [];
  }

  async runMission({ missionId, effect, input }) {
    const opKey = deriveOpKey({ missionId, effect, input });
    const correlationId = opKey;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      await this.journal.emit('EFFECT_DISPATCHED', this.name, {
        op_key: opKey, mission_id: missionId, effect,
        attempt, consequence: this.consequence,
      }, { logical_id: `dispatched:${opKey}:${attempt}`, correlation_id: correlationId });
      this.log.push({ ev: 'dispatch', opKey, attempt });

      try {
        const { result, duplicate } = await this.effector.execute(
          { opKey, missionId, effect, input, attempt, consequence: this.consequence, correlationId });
        this.log.push({ ev: 'completed', opKey, attempt, duplicate });
        return { status: 'completed', result, attempts: attempt, opKey, duplicate };
      } catch (err) {
        // NEW: timeout / lost ack is UNKNOWN, never assumed failure.
        this.log.push({ ev: 'timeout_or_lost', opKey, attempt, error: err.code || err.message });
        await this.journal.emit('EFFECT_UNKNOWN', this.name, {
          op_key: opKey, mission_id: missionId, attempt,
          reason: err.code || err.message,
        }, { logical_id: `unknown:${opKey}:${attempt}`, correlation_id: correlationId });

        const res = await reconcile(opKey, {
          journal: this.journal,
          effector: this.effector,
          consequence: this.consequence,
          maxAttempts: this.maxAttempts,
          correlationId,
        });
        this.log.push({ ev: 'reconciled', opKey, resolution: res.resolution });

        if (res.resolution === 'recovered') {
          return { status: 'completed', result: res.result, attempts: attempt, opKey, via: res.via };
        }
        if (res.resolution === 'retry_authorized') {
          attempt = res.nextAttempt - 1; // loop increments to nextAttempt
          continue;
        }
        if (res.resolution === 'held') {
          return { status: 'held', reason: res.reason, attempts: attempt, opKey };
        }
        return { status: 'failed', error: res.error, attempts: attempt, opKey };
      }
    }
  }
}

module.exports = { OldCoordinator, Coordinator };
