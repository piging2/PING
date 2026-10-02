/**
 * Mission Scheduler — PING Core v1
 *
 * Bridges MissionRuntime ↔ WorkerRuntime.
 *
 * Flow:
 *   MissionRuntime.getPending()
 *       ↓
 *   MissionScheduler polls, matches mission_type to worker
 *       ↓
 *   WorkerRuntime.dispatch(mission)
 *       ↓
 *   Worker completes → MissionRuntime.complete(missionId, result)
 *       ↓
 *   Event emitted → Mission Control updates
 *
 * Design:
 *   - Polls on interval (default 5s)
 *   - Maps mission_type → worker name via MISSION_WORKER_MAP
 *   - Skips missions already assigned (idempotent)
 *   - Gracefully no-ops when dependencies unavailable
 *   - Single source of truth: MissionRuntime
 *   - Retry re-entry is via reclaimRetryPending() (backoff-gated), never by
 *     dispatching retry_pending rows directly; every attempt is counted (F-01)
 *   - Dispatch is bounded by dispatchTimeoutMs; unknown outcomes emit a HOLD
 *     reconciliation record via the stuck-running watchdog (never FAILED)
 */

const crypto = require('crypto');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
const { deriveFailureRecord } = require('./failure_record.js');

// Map mission_type → worker name
// Workers register with WorkerRuntime using these names
//
// [DOC-CONTRACT] This map is LABELING / ASSIGNMENT metadata ONLY. It is NOT an
// execution-routing decider. The SINGLE canonical execution decider is
// WorkerRuntime.dispatch() (worker_runtime.js): a worker is selected iff
// entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType). This map
// is consumed only for (a) the `assigned_to` label (below) and (b) the
// registered-worker guard. The scheduler dispatches on the ORIGINAL business
// event_type (mission.payload.event_type), never mission_type, so a mission
// whose label-worker does not match the event type yields dispatch() = null →
// the mission is skipped/failed (phantom-complete prevention), not misrouted.
// Reference: docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md (audit A).
const MISSION_WORKER_MAP = {
  // Event pipeline missions
  DOCUMENT_IMPORT: 'observation',
  OBSERVATION_CREATE: 'observation',
  CLAIM_GENERATE: 'claim',
  CLASSIFICATION_CREATE: 'classification',
  RECOMMENDATION_CREATE: 'recommendation',
  PROJECTION_CREATE: 'projection',
  REPLAY_VERIFY: 'replay',
  WITNESS_CREATE: 'witness',
  LINEAGE_CREATE: 'lineage',

  // Knowledge missions
  KNOWLEDGE_EXTRACT: 'observation',
  KNOWLEDGE_INDEX: 'projection',

  // System missions — SYSTEM_HEALTH_CHECK is dispatched as the event_type by the
  // bridge (payload.event_type || mission.mission_type), so the worker must
  // include it in its eventTypes. Observation is the universal entry point.
  SYSTEM_HEALTH_CHECK: 'observation',
  SYSTEM_AUDIT: 'observation',

  // Business missions (from EventToMissionBridge)
  CUSTOMER_ONBOARD: 'observation',
  CUSTOMER_UPDATE: 'observation',
  LEAD_FOLLOWUP: 'observation',
  LEAD_CONVERT: 'observation',
  PROJECT_SETUP: 'observation',
  PROJECT_UPDATE: 'observation',
  PROJECT_CLOSEOUT: 'observation',
  ESTIMATE_PREPARE: 'observation',
  ESTIMATE_FOLLOWUP: 'observation',
  ESTIMATE_CONVERT: 'observation',
  INVOICE_TRACK: 'observation',
  INVOICE_FOLLOWUP: 'observation',
  INVOICE_CLOSE: 'observation',
  REVIEW_RESPONSE: 'observation',
  REVIEW_ACK: 'observation',
  EMAIL_PROCESS: 'observation',
};

class MissionScheduler {
  /**
   * @param {object} options
   * @param {object} options.missionRuntime — MissionRuntime instance
   * @param {object} options.workerRuntime — WorkerRuntime instance
   * @param {object} options.eventRuntime — UnifiedEventRuntime instance (for emitting)
   * @param {object} options.deadLetterAuthority — P0-5: receives recordDeadLetter(job, error) on exhaustion
   * @param {object} options.retryPolicy — P0-4: { max_attempts, backoff_delay_ms } default retry config
   * @param {number} options.pollIntervalMs — poll interval (default 5000)
   * @param {number} options.maxConcurrent — max missions processed in parallel (default 3)
   * @param {number} options.dispatchTimeoutMs — bound on one worker dispatch (default 120000);
   *   a dispatch that never settles yields an UNKNOWN outcome for the watchdog
   * @param {number} options.stuckThresholdMs — running/assigned missions older than this
   *   are reconciled as HOLD by the stuck-running watchdog (default 600000)
   */
  constructor(options = {}) {
    this._missionRuntime = options.missionRuntime || null;
    this._workerRuntime = options.workerRuntime || null;
    this._eventRuntime = options.eventRuntime || null;
    this._deadLetterAuthority = options.deadLetterAuthority || null;
    this._retryPolicy = options.retryPolicy || { max_attempts: 3, backoff_delay_ms: 5000 };
    this._pollIntervalMs = options.pollIntervalMs || 5000;
    this._maxConcurrent = options.maxConcurrent || 3;
    this._dispatchTimeoutMs = options.dispatchTimeoutMs || 120000;
    this._stuckThresholdMs = options.stuckThresholdMs || 600000;
    this._timer = null;
    this._running = false;
    this._processing = new Set(); // mission_ids currently being processed
    this._reconciled = new Set(); // mission_ids with an outstanding HOLD reconciliation record
    this._reconciliationLog = []; // bounded (100) observable record of reconciler emissions

    this._stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      renewals: 0,
      reconciled: 0,
      watchdogScans: 0,
    };
  }

  /**
   * Start the scheduler polling loop.
   */
  start() {
    if (!this._missionRuntime || !this._workerRuntime) {
      console.log('[MissionScheduler] Degraded mode — scheduler disabled (missing dependencies)');
      return;
    }
    if (this._running) return;
    this._running = true;
    console.log(`[MissionScheduler] Started — polling every ${this._pollIntervalMs}ms, maxConcurrent=${this._maxConcurrent}`);
    this._timer = setInterval(() => this._poll(), this._pollIntervalMs);
    // Run immediately
    this._poll();
  }

  /**
   * Stop the scheduler.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[MissionScheduler] Stopped');
  }

  /**
   * Single poll cycle: renew leases, reap orphans, reclaim due retries,
   * run the stuck-running watchdog, then dispatch new missions.
   */
  async _poll() {
    if (!this._missionRuntime || !this._workerRuntime) return;

    try {
      // Arrow 0: Renew leases for missions still being processed — prevents
      // the reaper from resetting in-progress missions whose workers are slow.
      // Must run BEFORE reapExpiredLeases so the lease is extended first.
      // Runs regardless of capacity — in-progress missions must always be renewed.
      for (const missionId of this._processing) {
        try {
          const renewed = await this._missionRuntime.renewLease(missionId);
          if (renewed > 0) this._stats.renewals++;
        } catch (renewErr) {
          // Non-fatal — if renewal fails, the reaper may reclaim on next cycle
          console.error(`[MissionScheduler] Lease renewal failed for ${missionId}: ${renewErr.message}`);
        }
      }

      // Arrow 1: Reap expired leases — turns assigned/running missions whose
      // lease expired back to created, enabling re-dispatch after worker crash.
      // Only catches orphaned missions NOT in the scheduler's _processing set
      // (those had their leases renewed in Arrow 0).
      try {
        const reaped = await this._missionRuntime.reapExpiredLeases();
        if (reaped > 0) console.log(`[MissionScheduler] Reaped ${reaped} expired leases`);
      } catch (reapErr) {
        console.error('[MissionScheduler] Lease reaping failed (non-fatal):', reapErr.message);
      }

      // Arrow 2: Reclaim due retries — moves retry_pending missions whose
      // retry_at backoff gate has elapsed back to created, so they re-enter
      // through the conditional claim. F-01 repair: retry_pending rows are
      // never dispatched directly, and the retries counter is never reset,
      // so every retry makes state progress toward exhaustion.
      // Capability-guarded: runtimes predating the repair (stubs, older
      // deployments) simply skip this arrow.
      if (typeof this._missionRuntime.reclaimRetryPending === 'function') {
        try {
          const reclaimed = await this._missionRuntime.reclaimRetryPending();
          if (reclaimed > 0) console.log(`[MissionScheduler] Reclaimed ${reclaimed} due retries`);
        } catch (reclaimErr) {
          console.error('[MissionScheduler] Retry reclaim failed (non-fatal):', reclaimErr.message);
        }
      }

      // Arrow 3: Stuck-running watchdog — detects missions holding running/
      // assigned beyond the bounded threshold and emits a HOLD reconciliation
      // record (never FAILED on timeout). Detection only; runs regardless of
      // capacity.
      try {
        await this.reconcileStuckRunning();
      } catch (watchErr) {
        console.error('[MissionScheduler] Watchdog scan failed (non-fatal):', watchErr.message);
      }

      // Arrow 4: Dispatch new missions — only when capacity available.
      if (this._processing.size >= this._maxConcurrent) return;

      const availableSlots = this._maxConcurrent - this._processing.size;
      const pending = await this._missionRuntime.getPending(availableSlots);

      for (const mission of pending) {
        if (this._processing.has(mission.mission_id)) continue;
        await this._dispatch(mission);
      }
    } catch (err) {
      console.error(`[MissionScheduler] Poll error: ${err.message}`);
    }
  }

  /**
   * Dispatch a mission to the appropriate worker.
   */
  async _dispatch(mission) {
    const workerName = MISSION_WORKER_MAP[mission.mission_type];
    if (!workerName) {
      console.log(`[MissionScheduler] No worker for mission type '${mission.mission_type}' — skipping ${mission.mission_id}`);
      this._stats.skipped++;
      return;
    }

    // Check if worker is registered
    const stats = this._workerRuntime.getStats();
    if (!stats.workers[workerName]) {
      console.log(`[MissionScheduler] Worker '${workerName}' not registered — skipping ${mission.mission_id}`);
      this._stats.skipped++;
      return;
    }

    this._processing.add(mission.mission_id);

    try {
      // Assign mission — F-01 repair: the conditional claim (P0-1) is the ONLY
      // gate into dispatch. If the row is no longer claimable (claimed
      // elsewhere, stale pending snapshot, retry_pending not yet reclaimed),
      // the worker is NEVER invoked for it.
      const claimed = await this._missionRuntime.assign(mission.mission_id, workerName);
      if (claimed < 1) {
        console.log(`[MissionScheduler] Mission ${mission.mission_id} not claimable (status changed since poll) — skipping dispatch`);
        this._stats.skipped++;
        return;
      }

      // Start mission
      await this._missionRuntime.start(mission.mission_id);

      // Build event for worker — dispatch on the ORIGINAL business event type
      // (mission.payload.event_type, stored by EventToMissionBridge), not the
      // mission_type. Workers register on business event types (e.g. LEAD_CREATED);
      // dispatching mission_type (e.g. LEAD_FOLLOWUP) would silently no-op and
      // produce a phantom completion. Mirrors test_commissioning.js:345-352.
      const payload = typeof mission.payload === 'string'
        ? JSON.parse(mission.payload)
        : (mission.payload || {});
      const event = {
        // Thread the original event fields through so downstream workers can
        // project (needs event_id), preserve namespace (privacy boundary) and
        // source, and unwrap the bridge's nested payload so workers read the
        // business payload directly (e.g. ObservationWorker's documentId).
        event_id: payload.event_id || mission.mission_id,
        event_type: payload.event_type || mission.mission_type,
        source: payload.source || 'mission-scheduler',
        // Namespace is set by the bridge from the spine event (always resolved);
        // the 'core::system' default is owned by UnifiedEventRuntime.emit() only.
        namespace: payload.namespace,
        mission_id: mission.mission_id,
        payload: payload.payload || payload,
        metadata: {
          mission_type: mission.mission_type,
          priority: mission.priority,
          assigned_to: workerName,
          canonical_hash: payload.canonical_hash || null,
          confidence: payload.confidence != null ? payload.confidence : null,
          correlation_id: payload.correlation_id || payload.event_id || mission.mission_id,
          causation_id: payload.event_id || null,
        },
      };

      // Dispatch to worker — P0-2: throws on worker failure. Bounded by the
      // dispatch timeout: a hung worker yields an UNKNOWN outcome, which the
      // watchdog reconciles as HOLD (never FAILED on timeout).
      const dispatchResult = await this._dispatchWithTimeout(event);
      this._stats.dispatched++;

      // P0-3: complete() only when worker returns verified ok.
      // Three outcomes:
      //   (a) dispatchResult.status === 'failed' → fail the mission (worker reported failure)
      //   (b) dispatchResult is null/undefined → no worker matched → skip (phantom-complete prevention)
      //   (c) dispatchResult.status === 'ok' (or truthy without status:'failed') → complete
      if (dispatchResult && dispatchResult.status === 'failed') {
        await this._failMission(mission, dispatchResult.error || 'worker returned failed status');
      } else if (!dispatchResult) {
        // No worker matched this event type — skip, do not phantom-complete.
        // This prevents the null-dispatch→complete gap where MISSION_WORKER_MAP maps a
        // mission type to a worker whose eventTypes don't include the dispatched event.
        console.log(`[MissionScheduler] No worker matched ${mission.mission_id} (event_type=${event.event_type}) — skipping`);
        this._stats.skipped++;
        await this._failMission(mission, `no worker matched event_type=${event.event_type}`);
      } else {
        await this._missionRuntime.complete(mission.mission_id, {
          worker: workerName,
          completed_at: constitutionalTimeAuthority.nowAsISOString(),
        });
        this._stats.completed++;
        // Resolved: a future stuck episode for this mission may be reconciled again.
        this._reconciled.delete(mission.mission_id);
      }
    } catch (err) {
      if (err && err.code === 'DISPATCH_TIMEOUT') {
        // Unknown outcome — HOLD for reconciliation. Deliberately NOT
        // _failMission: no automatic retry is derived for unknown effects
        // (retry safety unproven), and a timeout never resolves to FAILED.
        await this._reconcileUnknown(mission, workerName, err.message);
      } else {
        console.error(`[MissionScheduler] Mission ${mission.mission_id} failed: ${err.message}`);
        await this._failMission(mission, err.message);
      }
    } finally {
      this._processing.delete(mission.mission_id);
    }
  }

  /**
   * P0-4/P0-5: Fail with retry → exhaustion → DLQ.
   *
   * Calls failWithRetry on the mission. If the retry policy is exhausted
   * (retries >= max_attempts), the mission is `failed` and, when a
   * deadLetterAuthority is wired, recorded as a dead letter (P0-5).
   *
   * NOTE: deriveFailureRecord is deliberately NOT wired into this path —
   * held for a human word. Reconciliation records are emitted only by the
   * stuck-running watchdog (_reconcileUnknown) for UNKNOWN outcomes.
   */
  async _failMission(mission, error) {
    try {
      const retries = await this._missionRuntime.failWithRetry(
        mission.mission_id,
        error,
        this._retryPolicy,
      );

      // P0-5: after exhaustion, route to DLQ
      if (retries >= this._retryPolicy.max_attempts && this._deadLetterAuthority) {
        try {
          const payload = typeof mission.payload === 'string'
            ? JSON.parse(mission.payload)
            : (mission.payload || {});
          await this._deadLetterAuthority.recordDeadLetter(
            {
              job_id: mission.mission_id,
              job_type: mission.mission_type,
              mission_id: mission.mission_id,
              correlation_id: payload.correlation_id || payload.event_id || mission.mission_id,
              causation_id: payload.event_id || mission.mission_id,
              authority: 'MissionScheduler',
              authority_version: '1.0.0',
              created_at: mission.created_at ? new Date(mission.created_at).getTime() : Date.now(),
              retry_count: retries,
              payload,
            },
            new Error(error),
          );
        } catch (dlqErr) {
          console.error(`[MissionScheduler] DLQ record failed: ${dlqErr.message}`);
        }
      }
    } catch (failErr) {
      console.error(`[MissionScheduler] Failed to mark mission as failed: ${failErr.message}`);
    }
    this._stats.failed++;
  }

  /**
   * Dispatch a worker event with a bounded timeout.
   *
   * A worker that never settles yields an UNKNOWN outcome (effect_known=false):
   * the timer wins the race and throws a typed DISPATCH_TIMEOUT error. The
   * still-pending worker promise gets a no-op settlement handler so its late
   * resolution can never surface as an unhandled rejection; the mission row
   * truthfully keeps its `running` status until the worker (or a reconciler)
   * resolves it.
   */
  async _dispatchWithTimeout(event) {
    const timeoutMs = this._dispatchTimeoutMs;
    let dispatchPromise;
    try {
      dispatchPromise = Promise.resolve(this._workerRuntime.dispatch(event));
    } catch (syncErr) {
      // Synchronous throw from dispatch() — same as a rejected dispatch.
      throw syncErr;
    }
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`dispatch timeout after ${timeoutMs}ms (outcome unknown)`);
        err.code = 'DISPATCH_TIMEOUT';
        reject(err);
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });
    try {
      return await Promise.race([dispatchPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
      // Swallow the late settlement of a timed-out dispatch: the worker may
      // still finish, but its outcome arrived after the HOLD was emitted.
      dispatchPromise.then(() => {}, () => {});
    }
  }

  /**
   * Watchdog reconciler — emits a HOLD reconciliation record for an unknown
   * execution outcome.
   *
   * The record is derived mechanically via deriveFailureRecord() with dispatch
   * outcome 'unknown' and effect_known=false, which yields status
   * HOLD_RECONCILE, classification UNKNOWN_EXECUTION, and the literal
   * "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS". The mission row is NOT
   * touched: a timeout never resolves to FAILED, and no automatic retry is
   * derived for unknown effects.
   *
   * Emission is observable (MISSION_RECONCILE_HOLD event + bounded in-memory
   * log + stats) and replayable (the record carries mission_id, payload
   * digest, dispatch outcome, and correlation/causation ids; the failure_id is
   * derived deterministically from the execution result). Deduplicated per
   * mission: one outstanding HOLD per mission per session.
   */
  async _reconcileUnknown(mission, workerName, reason) {
    if (this._reconciled.has(mission.mission_id)) return null;

    let payload = {};
    try {
      payload = typeof mission.payload === 'string'
        ? JSON.parse(mission.payload)
        : (mission.payload || {});
    } catch (_) { payload = {}; }

    let record;
    try {
      record = deriveFailureRecord({
        mission,
        dispatch: { outcome: 'unknown', worker: workerName || null, error: reason, effect_known: false },
        policy: { max_attempts: this._retryPolicy.max_attempts },
        correlation_id: payload.correlation_id || payload.event_id || mission.mission_id,
        causation_id: payload.event_id || null,
      }, { now: constitutionalTimeAuthority.nowAsISOString() });
    } catch (deriveErr) {
      console.error(`[MissionScheduler] Reconciler derivation failed for ${mission.mission_id}: ${deriveErr.message}`);
      return null;
    }

    this._reconciled.add(mission.mission_id);

    if (this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_RECONCILE_HOLD', 'mission-scheduler', {
        missionId: mission.mission_id,
        record,
      });
    }
    this._reconciliationLog.push({
      mission_id: mission.mission_id,
      emitted_at: constitutionalTimeAuthority.nowAsISOString(),
      reason,
      record,
    });
    if (this._reconciliationLog.length > 100) this._reconciliationLog.shift();
    this._stats.reconciled++;
    console.log(`[MissionScheduler] ${record.display} — mission ${mission.mission_id} (${reason})`);
    return record;
  }

  /**
   * Stuck-running watchdog scan.
   *
   * Finds missions holding `running` (or `assigned`) whose last state progress
   * is older than the bounded stuck threshold and which this scheduler is not
   * actively processing, and emits a HOLD reconciliation record for each.
   * Detection only — mission rows are never failed, retried, or cancelled here.
   *
   * @returns {Promise<number>} count of missions reconciled in this scan
   */
  async reconcileStuckRunning() {
    if (!this._missionRuntime) return 0;
    // Capability guard: runtimes predating the watchdog (stubs, older
    // deployments) simply yield nothing to reconcile.
    if (typeof this._missionRuntime.findStuckRunning !== 'function') return 0;
    this._stats.watchdogScans++;
    const cutoffIso = new Date(Date.now() - this._stuckThresholdMs).toISOString();
    let rows = [];
    try {
      rows = await this._missionRuntime.findStuckRunning(cutoffIso);
    } catch (err) {
      console.error(`[MissionScheduler] Stuck-running scan query failed: ${err.message}`);
      return 0;
    }
    let count = 0;
    for (const row of rows) {
      if (this._processing.has(row.mission_id)) continue; // actively dispatched; lease renewal owns it
      if (this._reconciled.has(row.mission_id)) continue; // HOLD already outstanding
      const since = row.started_at || row.claimed_at || row.created_at;
      await this._reconcileUnknown(
        row,
        row.assigned_to,
        `stuck in '${row.status}' since ${since} (beyond ${this._stuckThresholdMs}ms threshold)`
      );
      count++;
    }
    return count;
  }

  /**
   * Observable reconciler emissions (bounded, most recent last).
   *
   * @returns {Array} copies of { mission_id, emitted_at, reason, record }
   */
  getReconciliationLog() {
    return this._reconciliationLog.slice();
  }

  /**
   * Get scheduler stats.
   */
  getStats() {
    return {
      ...this._stats,
      scope: 'session',
      running: this._running,
      processing: this._processing.size,
      pollIntervalMs: this._pollIntervalMs,
      maxConcurrent: this._maxConcurrent,
      dispatchTimeoutMs: this._dispatchTimeoutMs,
      stuckThresholdMs: this._stuckThresholdMs,
      reconciliationLogSize: this._reconciliationLog.length,
    };
  }
}

module.exports = { MissionScheduler, MISSION_WORKER_MAP };
