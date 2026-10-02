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
 */

const crypto = require('crypto');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');

// Map mission_type → worker name
// Workers register with WorkerRuntime using these names
//
// [DOC-CONTRACT] This map is LABELING / ASSIGNMENT metadata ONLY. It is NOT an
// execution-routing decider. The SINGLE canonical execution decider is
// WorkerRuntime.dispatch() (worker_runtime.js): a worker is selected iff
// entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType). This map
// is consumed only for (a) the `assigned_to` label (below) and (b) the
// registered-worker guard. The scheduler dispatches on the ORIGINAL business
// event_type (mission.payload.event_type), never mission_type. W-1A adds a
// dispatch-time consistency guard: a mission whose assigned worker is not
// registered for the dispatched event_type is failed WITHOUT dispatch (a
// forged missionType/event_type pair can no longer cross-dispatch to an
// inconsistent worker). Reference: docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md
// (audit A).
const MISSION_WORKER_MAP = {
  // Event pipeline missions
  DOCUMENT_IMPORT: 'observation',
  OBSERVATION_CREATE: 'observation',
  CLAIM_GENERATE: 'claim',
  CLASSIFICATION_CREATE: 'classification',
  RECOMMENDATION_CREATE: 'recommendation',
  PROJECTION_CREATE: 'projection',
  REPLAY_VERIFY: 'replay',
  // W-1A restore-trigger: spawned by the bridge from REPLAY_COMPLETED.
  WITNESS_ATTEST: 'witness',
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
   * @param {number} options.dispatchTimeoutMs — hung-worker watchdog (default 300000).
   *   A worker dispatch that has not settled in this long is declared timed out
   *   and the mission fails with retry through the normal path.
   */
  constructor(options = {}) {
    this._missionRuntime = options.missionRuntime || null;
    this._workerRuntime = options.workerRuntime || null;
    this._eventRuntime = options.eventRuntime || null;
    this._deadLetterAuthority = options.deadLetterAuthority || null;
    this._retryPolicy = options.retryPolicy || { max_attempts: 3, backoff_delay_ms: 5000 };
    this._pollIntervalMs = options.pollIntervalMs || 5000;
    this._maxConcurrent = options.maxConcurrent || 3;
    this._dispatchTimeoutMs = options.dispatchTimeoutMs || 300000;
    this._timer = null;
    this._running = false;
    this._processing = new Set(); // mission_ids currently being processed

    this._stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      renewals: 0,
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
   * Single poll cycle: get pending missions, dispatch to workers.
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

      // Arrow 1b: Reclaim due retries - O3 repair (2026-09-18). Moves
      // retry_pending missions whose retry_at elapsed back to created so
      // they re-enter through the atomic claim lifecycle. Without this,
      // due retries dispatched unclaimed: failWithRetry matched zero rows,
      // retries never incremented, and missions hot-looped forever.
      try {
        const reclaimedRetries = await this._missionRuntime.reclaimRetryPending();
        if (reclaimedRetries > 0) console.log('[MissionScheduler] Reclaimed ' + reclaimedRetries + ' due retries');
      } catch (reclaimErr) {
        console.error('[MissionScheduler] Retry reclaim failed (non-fatal):', reclaimErr.message);
      }

      // Arrow 2: Dispatch new missions — only when capacity available.
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
   * Dispatch to the worker with a hung-worker watchdog.
   *
   * Races the worker dispatch against a timer. Rejects with a timeout
   * error if the worker has not settled within _dispatchTimeoutMs. The
   * underlying worker promise is left to settle on its own: a late
   * settlement is harmless because every mission transition is
   * conditional on status (a stale completion matches 0 rows and emits
   * nothing). The timer is unref'd so it never delays process shutdown;
   * a mission abandoned at shutdown keeps its un-renewed lease and the
   * reaper recovers it.
   */
  async _dispatchWithTimeout(event) {
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`worker dispatch timed out after ${this._dispatchTimeoutMs}ms`));
      }, this._dispatchTimeoutMs);
      if (timeoutId && typeof timeoutId.unref === 'function') timeoutId.unref();
    });
    try {
      return await Promise.race([
        this._workerRuntime.dispatch(event),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
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
      // O4 repair (2026-09-18): honor the atomic claim verdict. assign()
      // returns 0 when another scheduler won the claim - stand down and
      // never dispatch the worker on a lost claim.
      const claimed = await this._missionRuntime.assign(mission.mission_id, workerName);
      if (claimed !== 1) {
        return;
      }

      // O4 repair (2026-09-18): only the claim winner may advance the
      // mission. start() is owner-checked; a 0 here means the claim was
      // lost between assign and start - stand down, never dispatch.
      const started = await this._missionRuntime.start(mission.mission_id, workerName);
      if (started !== 1) {
        return;
      }

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

      // W-1A dispatch-time consistency guard: the dispatched event_type must be
      // one the assigned worker actually registered for. WorkerRuntime.dispatch
      // selects handlers by event_type, so a mission whose payload.event_type
      // disagrees with its mission_type (e.g. a forged missionType
      // REPLAY_VERIFY carrying event_type REPLAY_COMPLETED) would otherwise
      // cross-dispatch to a worker inconsistent with the mission type
      // (falsified W-0). Fail the mission without dispatching any worker.
      const assignedEntry = stats.workers[workerName];
      const registeredTypes = (assignedEntry && assignedEntry.eventTypes) || [];
      if (!registeredTypes.includes(event.event_type)) {
        console.log(`[MissionScheduler] event_type/mission_type mismatch: mission ${mission.mission_id} (mission_type=${mission.mission_type}, assigned_to=${workerName}) cannot handle event_type=${event.event_type} — failing without dispatch`);
        this._stats.skipped++;
        await this._failMission(mission, `event_type_mismatch: worker '${workerName}' is not registered for event_type='${event.event_type}'`);
        return;
      }

      // Dispatch to worker with hung-worker watchdog (O5 repair 2026-09-18).
      // A dispatch that never settles would pin the mission in _processing
      // forever: Arrow 0 renews its lease every poll while Arrow 1 (reaper)
      // is structurally blind to _processing missions, so the lease never
      // expires and the work never recovers. On timeout the mission fails
      // with retry through the normal path and the lease stops renewing.
      // P0-2: throws on worker failure (including timeout).
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
      }
    } catch (err) {
      console.error(`[MissionScheduler] Mission ${mission.mission_id} failed: ${err.message}`);
      await this._failMission(mission, err.message);
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
    };
  }
}

module.exports = { MissionScheduler, MISSION_WORKER_MAP };
