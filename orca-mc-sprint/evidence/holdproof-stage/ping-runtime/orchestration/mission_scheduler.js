/**
 * Mission Scheduler - PING Core v1
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
 *   - Held missions are re-examined by the held-resolution sweep
 *     (reconcileHeldMissions): a late completion ack while held is a proven
 *     outcome resolved via resolveHold (PROVEN_OCCURRED); anything
 *     unprovable stays held (fail closed) but is escalated once it ages
 *     past holdEscalationMs, and the HOLD operator runbook plus
 *     resolve-hold-cli.js give PROVEN_NOT_OCCURRED / MANUAL_RESOLUTION a
 *     real invocation path (E3 liveness: no hold is silent forever, no
 *     hold is permanent by construction)
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
// whose label-worker does not match the event type yields a dispatch receipt
// with matched=false, routeExists=false (EXPLICIT NO_MATCH, observed by
// WorkerRuntime.dispatch()) → the mission fails terminally with no retry
// (phantom-complete prevention), not misrouted.
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

  // System missions - SYSTEM_HEALTH_CHECK is dispatched as the event_type by the
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
   * @param {object} options.missionRuntime - MissionRuntime instance
   * @param {object} options.workerRuntime - WorkerRuntime instance
   * @param {object} options.eventRuntime - UnifiedEventRuntime instance (for emitting)
   * @param {object} options.deadLetterAuthority - P0-5: receives recordDeadLetter(job, error) on exhaustion
   * @param {object} options.retryPolicy - P0-4: { max_attempts, backoff_delay_ms } default retry config
   * @param {number} options.pollIntervalMs - poll interval (default 5000)
   * @param {number} options.maxConcurrent - max missions processed in parallel (default 3)
   * @param {number} options.dispatchTimeoutMs - bound on one worker dispatch (default 120000);
   *   a dispatch that never settles yields an UNKNOWN outcome for the watchdog
   * @param {number} options.stuckThresholdMs - running/assigned missions older than this
   *   are reconciled as HOLD by the stuck-running watchdog (default 600000)
   * @param {number} options.holdEscalationMs - held missions older than this
   *   with no proven outcome are escalated (re-surfaced via an escalated
   *   MISSION_RECONCILE_HOLD emission, the reconciliation log, and stats)
   *   so true-unknown holds cannot sit silently forever (default 86400000
   *   = 24h; E3 liveness repair)
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
    this._holdEscalationMs = options.holdEscalationMs || 86400000; // E3 liveness: age-out escalation threshold
    this._timer = null;
    this._running = false;
    this._processing = new Set(); // mission_ids currently being processed
    this._reconciled = new Set(); // mission_ids with an outstanding HOLD reconciliation record
    this._escalatedHolds = new Set(); // episode keys (mission_id|hold_at) already escalated (E3 liveness)
    this._reconciliationLog = []; // bounded (100) observable record of reconciler emissions

    this._stats = {
      dispatched: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      renewals: 0,
      reconciled: 0,
      holdsResolved: 0, // holds resolved to a proven outcome via resolveHold (E2 liveness)
      holdsEscalated: 0, // aged holds re-surfaced because no outcome was proven (E3 liveness)
      watchdogScans: 0,
      unknown: 0, // matched dispatches that returned no result (fail-closed UNKNOWN)
    };
  }

  /**
   * Start the scheduler polling loop.
   */
  start() {
    if (!this._missionRuntime || !this._workerRuntime) {
      console.log('[MissionScheduler] Degraded mode - scheduler disabled (missing dependencies)');
      return;
    }
    if (this._running) return;
    this._running = true;
    console.log(`[MissionScheduler] Started - polling every ${this._pollIntervalMs}ms, maxConcurrent=${this._maxConcurrent}`);
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
      // Arrow 0: Renew leases for missions still being processed - prevents
      // the reaper from resetting in-progress missions whose workers are slow.
      // Must run BEFORE reapExpiredLeases so the lease is extended first.
      // Runs regardless of capacity - in-progress missions must always be renewed.
      for (const missionId of this._processing) {
        try {
          const renewed = await this._missionRuntime.renewLease(missionId);
          if (renewed > 0) this._stats.renewals++;
        } catch (renewErr) {
          // Non-fatal - if renewal fails, the reaper may reclaim on next cycle
          console.error(`[MissionScheduler] Lease renewal failed for ${missionId}: ${renewErr.message}`);
        }
      }

      // Arrow 1: Reap expired leases - turns assigned/running missions whose
      // lease expired back to created, enabling re-dispatch after worker crash.
      // Only catches orphaned missions NOT in the scheduler's _processing set
      // (those had their leases renewed in Arrow 0).
      try {
        const reaped = await this._missionRuntime.reapExpiredLeases();
        if (reaped > 0) console.log(`[MissionScheduler] Reaped ${reaped} expired leases`);
      } catch (reapErr) {
        console.error('[MissionScheduler] Lease reaping failed (non-fatal):', reapErr.message);
      }

      // Arrow 2: Reclaim due retries - moves retry_pending missions whose
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

      // Arrow 3: Stuck-running watchdog - detects missions holding running/
      // assigned beyond the bounded threshold and emits a HOLD reconciliation
      // record (never FAILED on timeout). Detection only; runs regardless of
      // capacity.
      try {
        await this.reconcileStuckRunning();
      } catch (watchErr) {
        console.error('[MissionScheduler] Watchdog scan failed (non-fatal):', watchErr.message);
      }

      // Arrow 3b: Held-resolution sweep - the HOLD exit (E2 liveness repair).
      // Held missions are invisible to every dispatch-eligibility path, so
      // without this sweep they would accumulate forever. Re-examines each
      // held mission and resolves the hold via resolveHold when the outcome
      // is now PROVEN from durable state (late completion ack). Anything
      // unprovable stays held (fail closed). Runs regardless of capacity.
      // Capability-guarded: runtimes predating the repair simply skip it.
      try {
        await this.reconcileHeldMissions();
      } catch (heldErr) {
        console.error('[MissionScheduler] Held-resolution sweep failed (non-fatal):', heldErr.message);
      }

      // Arrow 4: Dispatch new missions - only when capacity available.
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
      console.log(`[MissionScheduler] No worker for mission type '${mission.mission_type}' - skipping ${mission.mission_id}`);
      this._stats.skipped++;
      return;
    }

    // Check if worker is registered
    const stats = this._workerRuntime.getStats();
    if (!stats.workers[workerName]) {
      console.log(`[MissionScheduler] Worker '${workerName}' not registered - skipping ${mission.mission_id}`);
      this._stats.skipped++;
      return;
    }

    this._processing.add(mission.mission_id);

    try {
      // Assign mission - F-01 repair: the conditional claim (P0-1) is the ONLY
      // gate into dispatch. If the row is no longer claimable (claimed
      // elsewhere, stale pending snapshot, retry_pending not yet reclaimed),
      // the worker is NEVER invoked for it.
      const claimed = await this._missionRuntime.assign(mission.mission_id, workerName);
      if (claimed < 1) {
        console.log(`[MissionScheduler] Mission ${mission.mission_id} not claimable (status changed since poll) - skipping dispatch`);
        this._stats.skipped++;
        return;
      }

      // Start mission
      await this._missionRuntime.start(mission.mission_id);

      // Build event for worker - dispatch on the ORIGINAL business event type
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
        // LANE B (TenantOS): the mission row's immutable tenant_id (W3) is the
        // authoritative ownership context for this execution. Workers - including
        // the Orca/headless-agent adapter - and W4's tenant pin read it from here,
        // never from payload.namespace (caller-claimed at creation).
        tenant_id: mission.tenant_id || null,
        mission_id: mission.mission_id,
        payload: payload.payload || payload,
        metadata: {
          mission_type: mission.mission_type,
          tenant_id: mission.tenant_id || null,
          priority: mission.priority,
          assigned_to: workerName,
          canonical_hash: payload.canonical_hash || null,
          confidence: payload.confidence != null ? payload.confidence : null,
          correlation_id: payload.correlation_id || payload.event_id || mission.mission_id,
          causation_id: payload.event_id || null,
        },
      };

      // Dispatch to worker - P0-2: throws on worker failure. Bounded by the
      // dispatch timeout: a hung worker yields an UNKNOWN outcome, which the
      // watchdog reconciles as HOLD (never FAILED on timeout).
      const receipt = await this._dispatchWithTimeout(event);
      this._stats.dispatched++;

      // P0-3 / WR fail-closed repair (2026-09-26): complete() only on
      // positive completion evidence; the receipt carries observed routing
      // evidence from WorkerRuntime.dispatch(), so `matched` is true iff a
      // worker actually ran for this event. Outcomes:
      //   (a) dispatch threw                        -> FAILED per existing contract (catch below)
      //   (b) matched=false, routeExists=false       -> EXPLICIT NO_MATCH, observed.
      //        Terminal fail, NO retry: a retry could never route.
      //   (c) matched=false, routeExists=true        -> worker at maxConcurrent; no
      //        handler ran, so no effect could have occurred. fail-with-retry
      //        preserves the pre-repair behavior for this transient case.
      //   (d) matched, result.status === 'failed'    -> worker reported failure -> FAILED
      //   (e) matched, result truthy                 -> SUCCEEDED: positive completion evidence
      //   (f) matched, result falsy (undefined/null) -> UNKNOWN. Absence of a return
      //        value is not evidence of absence of effect: the handler may have
      //        performed an external effect and returned nothing. Reconcile as
      //        HOLD via the existing unknown-outcome machinery. NEVER auto-retry
      //        an external effect on ambiguous evidence.
      //
      // The pre-repair branch (b) narrated EVERY falsy dispatch as
      // "no worker matched" and retried it - fabricating a routing fact to
      // justify redispatching a possibly-effected mission. That inference is
      // deleted: a falsy dispatch with matched=true is UNKNOWN, not NO_MATCH.
      const result = receipt && typeof receipt === 'object' ? receipt.result : null;
      if (!receipt || typeof receipt !== 'object') {
        // No receipt at all - nothing observed. Fail closed to UNKNOWN.
        this._stats.unknown++;
        await this._reconcileUnknown(mission, workerName,
          `dispatch returned no receipt for event_type=${event.event_type} - outcome unknown`);
      } else if (!receipt.matched && !receipt.routeExists) {
        // (b) EXPLICIT NO_MATCH - observed by WorkerRuntime.dispatch(), not inferred.
        this._stats.skipped++;
        await this._failMission(mission,
          `no worker matched event_type=${event.event_type} (dispatch receipt: matched=false, routeExists=false)`,
          { max_attempts: 1 });
      } else if (!receipt.matched) {
        // (c) Route exists but worker at capacity - no handler ran, no effect possible.
        this._stats.skipped++;
        await this._failMission(mission,
          `worker at max concurrency for event_type=${event.event_type} - no handler ran, safe to retry`);
      } else if (result && result.status === 'failed') {
        // (d) Worker reported failure.
        await this._failMission(mission, result.error || 'worker returned failed status');
      } else if (result) {
        // (e) SUCCEEDED - positive completion evidence.
        await this._missionRuntime.complete(mission.mission_id, {
          worker: workerName,
          completed_at: constitutionalTimeAuthority.nowAsISOString(),
        });
        this._stats.completed++;
        // Resolved: a future stuck episode for this mission may be reconciled again.
        this._reconciled.delete(mission.mission_id);
      } else {
        // (f) UNKNOWN - matched worker returned nothing.
        this._stats.unknown++;
        await this._reconcileUnknown(mission, workerName,
          `worker '${receipt.worker}' matched event_type=${event.event_type} but returned no result - outcome unknown, effect may have occurred`);
      }
    } catch (err) {
      if (err && err.code === 'DISPATCH_TIMEOUT') {
        // Unknown outcome - HOLD for reconciliation. Deliberately NOT
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
   * NOTE: deriveFailureRecord is deliberately NOT wired into this path -
   * held for a human word. Reconciliation records are emitted only by the
   * stuck-running watchdog (_reconcileUnknown) for UNKNOWN outcomes.
   *
   * @param {object} [policyOverride] - WR fail-closed repair: replaces the
   *   retry policy for this failure only. The EXPLICIT NO_MATCH branch passes
   *   { max_attempts: 1 } so a mission that can never route fails terminally
   *   on the first failure instead of burning retries.
   */
  async _failMission(mission, error, policyOverride) {
    const policy = policyOverride || this._retryPolicy;
    try {
      const retries = await this._missionRuntime.failWithRetry(
        mission.mission_id,
        error,
        policy,
      );

      // P0-5: after exhaustion, route to DLQ
      if (retries >= policy.max_attempts && this._deadLetterAuthority) {
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
      // Synchronous throw from dispatch() - same as a rejected dispatch.
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
   * E3 H2 repair: is this mission's HOLD reconciliation genuinely still
   * outstanding?
   *
   * The _reconciled entry is per hold episode, not per mission per session.
   * An entry counts as outstanding only while the durable hold still stands
   * (fresh re-read of hold_at). A hold resolved externally clears its entry:
   * resolveHold is the only writer that clears hold_at, and
   * operator/external-verifier callers (PROVEN_NOT_OCCURRED /
   * MANUAL_RESOLUTION through the runbook CLI) bypass this scheduler's
   * memory, so the in-memory set cannot be cleared at resolve time from
   * here. Fail closed: if the row cannot be re-read (or the runtime predates
   * getMission), the entry is treated as outstanding, preserving the pre-E3
   * dedup behavior.
   *
   * @returns {Promise<boolean>} true iff a HOLD for this mission is outstanding
   */
  async _holdStillOutstanding(missionId) {
    if (!this._reconciled.has(missionId)) return false;
    if (!this._missionRuntime || typeof this._missionRuntime.getMission !== 'function') return true;
    let row = null;
    try {
      row = await this._missionRuntime.getMission(missionId);
    } catch (err) {
      console.error(`[MissionScheduler] Hold-episode re-read failed for ${missionId}: ${err.message} (keeping dedup entry, fail closed)`);
      return true;
    }
    if (row && row.hold_at) return true;
    // The durable hold is gone: the episode ended (resolveHold ran after the
    // entry was recorded). Drop the stale entry so the next unknown outcome
    // reconciles fresh instead of returning null into a reaper redispatch.
    this._reconciled.delete(missionId);
    return false;
  }

  /**
   * Single emission site for MISSION_RECONCILE_HOLD (E3 D3: the static audit
   * requires exactly one textual emit site for the scheduler event type).
   * Both the initial unknown-outcome emission and the aged-hold escalation
   * route through here; the escalation is distinguished in the event data
   * (escalated:true), not by a new event type.
   *
   * @param {object} data - event payload
   * @returns {Promise<void>}
   */
  async _emitReconcileHold(data) {
    if (this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_RECONCILE_HOLD', 'mission-scheduler', data);
    }
  }

  /**
   * Watchdog reconciler - emits a HOLD reconciliation record for an unknown
   * execution outcome.
   *
   * The record is derived mechanically via deriveFailureRecord() with dispatch
   * outcome 'unknown' and effect_known=false, which yields status
   * HOLD_RECONCILE, classification UNKNOWN_EXECUTION, and the literal
   * "OUTCOME UNKNOWN - RECONCILIATION IN PROGRESS". The HOLD is persisted
   * durably via markHold (fail closed on markHold→0: the row is re-read and
   * its ACTUAL state handled - a reclaimed row is re-held, an already-held
   * row is honored, a resolved or missing row stands down;
   * MISSION_RECONCILE_HOLD is NEVER emitted for an un-held row). A timeout
   * never resolves to FAILED, and no automatic retry is derived for unknown
   * effects.
   *
   * Emission is observable (MISSION_RECONCILE_HOLD event + bounded in-memory
   * log + stats) and replayable (the record carries mission_id, payload
   * digest, dispatch outcome, and correlation/causation ids; the failure_id is
   * derived deterministically from the execution result). Deduplicated per
   * hold episode: one outstanding HOLD per mission per session while the
   * durable hold still stands (E3 H2: a hold resolved externally clears its
   * entry, so the next genuine unknown outcome reconciles fresh).
   */
  async _reconcileUnknown(mission, workerName, reason) {
    // E3 H2: one PNO per session must not permanently disable re-holding.
    // _holdStillOutstanding re-reads the durable hold; a resolved episode
    // clears its stale entry here, so the second unknown outcome below gets
    // a fresh markHold + HOLD event instead of null.
    if (await this._holdStillOutstanding(mission.mission_id)) return null;

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

    // HOLD CONSTITUTIONAL (locked 2026-09-27; E2 race repair): persist the
    // HOLD durably, and FAIL CLOSED if the durable hold was lost to a commit
    // race. markHold is conditional: if reapExpiredLeases() committed first,
    // the row is already back in 'created' and the UPDATE matches 0 rows.
    // The pre-E2 code ignored that 0, emitted MISSION_RECONCILE_HOLD anyway,
    // and the mission was silently re-dispatched (C1 falsification: 2 effects
    // for 1 mission). On 0 affected rows the row is re-read and its ACTUAL
    // state handled (_recoverLostHold): a reaper-reclaimed row is re-held,
    // an already-standing hold is honored, a resolved or missing row stands
    // down; E3 H1 refuses "OUTCOME UNKNOWN" for known-failed rows and E3 H5
    // refuses to re-hold across an operator resolution. NEVER emit
    // MISSION_RECONCILE_HOLD for an un-held row, and NEVER leave a
    // reaper-reclaimed row dispatchable. Capability-guarded for runtimes
    // predating the repair.
    let heldRows = 0;
    if (typeof this._missionRuntime.markHold === 'function') {
      heldRows = await this._missionRuntime.markHold(mission.mission_id, reason);
    }
    if (heldRows === 0) {
      const recovered = await this._recoverLostHold(mission, reason);
      if (!recovered) {
        // Fail closed: no durable hold stands. Undo the in-memory dedup so a
        // later pass can re-examine once state settles; emit nothing - a HOLD
        // event for an un-held row would be a lie.
        this._reconciled.delete(mission.mission_id);
        console.error(`[MissionScheduler] HOLD not durably recorded for ${mission.mission_id} (markHold→0, recovery failed) - no HOLD emitted (fail closed)`);
        return null;
      }
    }

    await this._emitReconcileHold({
      missionId: mission.mission_id,
      record,
    });
    this._reconciliationLog.push({
      mission_id: mission.mission_id,
      emitted_at: constitutionalTimeAuthority.nowAsISOString(),
      reason,
      record,
    });
    if (this._reconciliationLog.length > 100) this._reconciliationLog.shift();
    this._stats.reconciled++;
    console.log(`[MissionScheduler] ${record.display} - mission ${mission.mission_id} (${reason})`);
    return record;
  }

  /**
   * Stuck-running watchdog scan.
   *
   * Finds missions holding `running` (or `assigned`) whose last state progress
   * is older than the bounded stuck threshold and which this scheduler is not
   * actively processing, and emits a HOLD reconciliation record for each.
   * Detection only - mission rows are never failed, retried, or cancelled here.
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
      if (await this._holdStillOutstanding(row.mission_id)) continue; // HOLD episode still outstanding (E3 H2)
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
   * Race-recovery for a lost HOLD write (E2 repair of the C1 falsification;
   * E3 H1/H5 hardening).
   *
   * Called when markHold affected 0 rows. Re-reads the row and handles its
   * ACTUAL state instead of the reconciler's possibly-stale snapshot:
   *   - row missing              -> false (nothing to hold; stand down)
   *   - hold_at already set      -> true  (a parallel reconciler's hold
   *                                 stands; the row IS held, so a HOLD event
   *                                 for it remains truthful)
   *   - E3 H5: the snapshot showed a standing hold but the re-read shows
   *     none -> false. Only resolveHold clears hold_at (markHold is the
   *     sole setter), so a resolution ran between the snapshot and this
   *     re-read; re-holding would reverse the operator/verifier's decision.
   *     Stand down: no hold, no event.
   *   - status 'created'         -> re-hold ONLY when the row is
   *     reaper-reclaimed (retry_at stamped NOW() by reapExpiredLeases):
   *     the attempt's outcome is still genuinely unknown. E3 H1: a
   *     'created' row with retry_at NULL got here via reclaimRetryPending
   *     (a KNOWN failure was recorded by failWithRetry) or via operator
   *     PROVEN_NOT_OCCURRED (a fresh authorized attempt): neither is an
   *     unknown outcome, so stand down instead of emitting a lying
   *     "OUTCOME UNKNOWN" hold the sweep could never resolve.
   *   - status running/assigned  -> retry the hold once (transient
   *                                 interleaving), else stand down
   *   - terminal / retry_pending / anything else -> false (the outcome is
   *     already recorded or owned by the retry path; no hold, no event)
   * Capability-guarded: runtimes predating markHold/getMission fail closed.
   * Reconciler authority preserved: _reconcileUnknown remains the sole HOLD
   * writer; reconcileHeldMissions (below) is the sole HOLD resolver - both
   * live in the scheduler, nowhere else.
   *
   * @param {object|string} mission - the reconciler's snapshot (object), or
   *   a bare mission_id (legacy call shape; the H5 snapshot check is then
   *   skipped)
   * @param {string} reason - hold reason
   * @returns {Promise<boolean>} true iff a durable hold now stands for the mission
   */
  async _recoverLostHold(mission, reason) {
    if (typeof this._missionRuntime.markHold !== 'function' ||
        typeof this._missionRuntime.getMission !== 'function') {
      return false;
    }
    const missionId = (mission && typeof mission === 'object') ? mission.mission_id : mission;
    const snapshotHoldAt = (mission && typeof mission === 'object') ? mission.hold_at : null;
    let row = null;
    try {
      row = await this._missionRuntime.getMission(missionId);
    } catch (err) {
      console.error(`[MissionScheduler] Hold-recovery re-read failed for ${missionId}: ${err.message}`);
      return false;
    }
    if (!row) return false;
    if (row.hold_at) return true;
    // E3 H5: the snapshot saw a standing hold but the re-read sees none.
    // Only resolveHold clears hold_at, so a resolution ran between the
    // snapshot and this re-read. Re-holding now would reverse the
    // operator's or verifier's decision. Stand down.
    if (snapshotHoldAt) {
      console.error(`[MissionScheduler] Hold for ${missionId} was resolved after the reconciler snapshot (hold_at cleared) - standing down, no re-hold (E3 H5)`);
      return false;
    }
    // E3 H1: a 'created' row reaching recovery became 'created' after
    // markHold saw a non-holdable state. Re-hold only the reaper-reclaimed
    // case (retry_at stamped NOW() by reapExpiredLeases: same attempt, the
    // outcome is still unknown). retry_at NULL means reclaimRetryPending
    // moved a KNOWN-failed row, or an operator PNO authorized a fresh
    // attempt: neither is an unknown outcome.
    if (row.status === 'created') {
      if (!row.retry_at) return false;
      const n = await this._missionRuntime.markHold(missionId, reason);
      return n === 1;
    }
    if (row.status === 'running' || row.status === 'assigned') {
      const n = await this._missionRuntime.markHold(missionId, reason);
      return n === 1;
    }
    return false;
  }

  /**
   * Held-mission resolution sweep - the HOLD exit (E2 liveness repair, E3
   * escalation + operator path).
   *
   * Held missions are excluded from reapExpiredLeases, reclaimRetryPending,
   * getPending, assign and findStuckRunning, so without a resolution path
   * they would accumulate forever. This sweep re-examines each held mission
   * and, when the outcome is now PROVEN from durable state, resolves the
   * hold via MissionRuntime.resolveHold - the ONLY exit from HOLD
   * (reconciler authority preserved: _reconcileUnknown remains the sole
   * HOLD writer; this is the sole HOLD resolver).
   *
   * Provenance of proof - FAIL CLOSED: no proof -> the hold stands.
   *   PROVEN_OCCURRED    - the row now carries a durable terminal result: a
   *     late worker ack landed through complete() while the mission was held
   *     (E3 H3: complete() now lands on held rows in any holdable status,
   *     so this is reachable for C1-recovery re-holds too; the worker's own
   *     outcome record is authoritative). The result is adopted and the
   *     mission stays terminal; it is never re-dispatched.
   *   PROVEN_NOT_OCCURRED / MANUAL_RESOLUTION - not derivable from row state
   *     alone (absence of evidence is not evidence of absence). They are
   *     available through resolveHold for operator/external-verifier
   *     callers holding genuine proof; the concrete invocation path is
   *     resolve-hold-cli.js in this directory, documented in
   *     HOLD_OPERATOR_RUNBOOK.md (E3 liveness: the operator path is real,
   *     not future work).
   *
   * E3 liveness (b): a hold whose outcome stays unproven past
   * holdEscalationMs is escalated by this sweep (escalated
   * MISSION_RECONCILE_HOLD emission + log + stats). The hold itself is never
   * auto-cleared: escalation surfaces the stuck hold, it does not resolve
   * it. No new event types: the escalation reuses MISSION_RECONCILE_HOLD
   * with escalated:true in the event data.
   *
   * HOLD LIFECYCLE (locked 2026-09-27, E2):
   *   UNKNOWN EFFECT -> markHold (durable) -> MISSION_RECONCILE_HOLD event ->
   *   held (invisible to reaper / reclaim / pending / assign / watchdog) ->
   *   resolveHold:
   *     PROVEN_OCCURRED     -> 'completed', result adopted, never re-dispatched
   *     PROVEN_NOT_OCCURRED -> 'created', attempt clocks reset (started_at,
   *                            claimed_at, lease_until, assigned_to,
   *                            retry_at), exactly one new attempt through the
   *                            conditional claim
   *     MANUAL_RESOLUTION   -> 'completed', operator record, never re-dispatched
   *
   * @param {number} [limit] - max held missions examined per sweep (default 100)
   * @returns {Promise<number>} count of holds resolved in this sweep
   */
  async reconcileHeldMissions(limit = 100) {
    if (!this._missionRuntime) return 0;
    // Capability guard: runtimes predating the HOLD repair (stubs, older
    // deployments) simply yield nothing to resolve.
    if (typeof this._missionRuntime.findHeld !== 'function' ||
        typeof this._missionRuntime.resolveHold !== 'function') return 0;
    let rows = [];
    try {
      rows = await this._missionRuntime.findHeld(limit);
    } catch (err) {
      console.error(`[MissionScheduler] Held-resolution scan query failed: ${err.message}`);
      return 0;
    }
    let resolved = 0;
    for (const row of rows) {
      // PROVEN_OCCURRED: late completion ack while held - the worker's own
      // durable outcome record. Adopt it; stay terminal; never re-dispatch.
      if (row.status === 'completed' && row.hold_at != null && row.result != null) {
        let result = row.result;
        try {
          result = typeof result === 'string' ? JSON.parse(result) : (result || {});
        } catch (_) {
          result = {};
        }
        try {
          const n = await this._missionRuntime.resolveHold(row.mission_id, 'PROVEN_OCCURRED', result || {});
          if (n === 1) {
            resolved++;
            this._stats.holdsResolved++;
            // Resolved: a future stuck episode for this mission may be reconciled again.
            this._reconciled.delete(row.mission_id);
            this._escalatedHolds.delete(`${row.mission_id}|${String(row.hold_at)}`);
            console.log(`[MissionScheduler] HOLD resolved PROVEN_OCCURRED for ${row.mission_id} (late completion ack adopted)`);
          }
        } catch (resErr) {
          console.error(`[MissionScheduler] HOLD resolution failed for ${row.mission_id}: ${resErr.message}`);
        }
        continue;
      }
      // Unresolvable this pass: age the hold. Escalation surfaces it; the
      // hold itself stands (fail closed).
      try {
        await this._escalateAgedHold(row);
      } catch (escErr) {
        console.error(`[MissionScheduler] Hold escalation failed for ${row.mission_id}: ${escErr.message}`);
      }
    }
    return resolved;
  }

  /**
   * E3 liveness (b): escalate a hold that aged past holdEscalationMs with no
   * proven outcome.
   *
   * Re-surfaces the stuck hold via an escalated MISSION_RECONCILE_HOLD
   * emission (escalated:true in the event data; no new event type), the
   * bounded reconciliation log, and stats.holdsEscalated. Once per hold
   * episode (keyed mission_id|hold_at): a scheduler restart re-arms it, so
   * a restart cannot silently lose the alert. The hold itself is NEVER
   * auto-cleared here - escalation is a signal, not a resolution; only
   * resolveHold (sweep PROVEN_OCCURRED, or the operator CLI path) ends a
   * hold.
   *
   * @returns {Promise<boolean>} true iff this call escalated the hold
   */
  async _escalateAgedHold(row) {
    if (!row || !row.hold_at) return false;
    let ageMs = 0;
    try {
      ageMs = Date.now() - new Date(row.hold_at).getTime();
    } catch (_) {
      return false;
    }
    if (!(ageMs > this._holdEscalationMs)) return false;
    const episodeKey = `${row.mission_id}|${String(row.hold_at)}`;
    if (this._escalatedHolds.has(episodeKey)) return false;
    this._escalatedHolds.add(episodeKey);

    let payload = {};
    try {
      payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
    } catch (_) { payload = {}; }
    let record = null;
    try {
      record = deriveFailureRecord({
        mission: row,
        dispatch: {
          outcome: 'unknown',
          worker: row.assigned_to || null,
          error: `hold aged ${ageMs}ms past the ${this._holdEscalationMs}ms escalation threshold with no proven outcome - operator attention required (see HOLD_OPERATOR_RUNBOOK.md)`,
          effect_known: false,
        },
        policy: { max_attempts: this._retryPolicy.max_attempts },
        correlation_id: payload.correlation_id || payload.event_id || row.mission_id,
        causation_id: payload.event_id || null,
      }, { now: constitutionalTimeAuthority.nowAsISOString() });
    } catch (deriveErr) {
      console.error(`[MissionScheduler] Hold-escalation derivation failed for ${row.mission_id}: ${deriveErr.message}`);
    }

    await this._emitReconcileHold({
      missionId: row.mission_id,
      record,
      escalated: true,
      holdAgeMs: ageMs,
    });
    this._reconciliationLog.push({
      mission_id: row.mission_id,
      emitted_at: constitutionalTimeAuthority.nowAsISOString(),
      reason: 'hold-escalation: aged past holdEscalationMs with no proven outcome',
      escalated: true,
      holdAgeMs: ageMs,
      record,
    });
    if (this._reconciliationLog.length > 100) this._reconciliationLog.shift();
    this._stats.holdsEscalated++;
    console.log(`[MissionScheduler] HOLD ESCALATED for ${row.mission_id} (age ${ageMs}ms > ${this._holdEscalationMs}ms, outcome still unknown)`);
    return true;
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
