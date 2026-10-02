/**
 * Mission Runtime — PING Core v1
 * 
 * Single canonical mission system. Missions are work units dispatched by Orca,
 * executed by workers, tracked here. Replaces 12 dead mission implementations.
 * 
 * Mission lifecycle: created → assigned → running → completed/failed → archived
 *
 * Retry lifecycle (F-01 repair): running → retry_pending →(reclaimRetryPending,
 * backoff-gated)→ created → assigned → running … → failed (exhaustion).
 * retry_pending rows are NEVER dispatched directly: they re-enter through the
 * conditional claim, so every attempt is counted and retries stay bounded.
 *
 * Unknown-outcome lifecycle (HOLD invariant, CEO 2026-09-24):
 *   running → hold — the outcome is uncertain and the execution MAY have
 *   produced an external effect. `hold` is terminal for automatic machinery:
 *   no automatic retry, no reaper reclaim, no dispatch, no lease renewal.
 *   Lease expiry NEVER turns `hold` (or `running`) back into `created` —
 *   HOLD is non-dispatchable: the conditional claim and getPending() both
 *   require retry_eligibility, which HOLD clears.
 *   Exit from `hold` is ONLY via reconcileHold() with evidence, to exactly
 *   one of: SUCCEEDED (effect proven happened) / FAILED (failure proven —
 *   never a timeout) / SAFE_TO_RETRY (retry proven safe: effect proven
 *   absent, or a proven idempotency contract) / continued HOLD.
 *   TIMEOUT != FAILED, always. PARKED is not used: the system has no
 *   distinct non-failure waiting state that needs the word.
 *
 * Proven outcome model (per-mission observables):
 *   logical_operation_id — stable identity of the logical operation across
 *     HOLD, restarts, and re-attempts. Never reminted: retries reuse the row.
 *   effect_count — external effects this operation is believed to have
 *     produced. Incremented on every worker invocation (conservative: the
 *     invocation may have produced it); corrected to 0 only when
 *     reconciliation PROVES non-occurrence. The invariant: it never reaches 2
 *     through automatic machinery.
 *   outcome — UNKNOWN | SUCCEEDED | FAILED | SAFE_TO_RETRY.
 *   retry_eligibility — the structural dispatch gate beside status.
 *   reconciliation_required — true while reconciliation owns the next
 *     transition.
 * 
 * Mission Control navigates these via events/queues, not CRUD.
 */

class MissionRuntime {
  /**
   * @param {object} options
   * @param {object} options.pool — pg.Pool
   * @param {object} options.eventRuntime — UnifiedEventRuntime instance
   */
  constructor(options = {}) {
    this._pool = options.pool || null;
    this._eventRuntime = options.eventRuntime || null;
    this._activeMissions = new Map();
  }

  /**
   * Initialize mission tables.
   */
  async initialize() {
    if (!this._pool) return;
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS ping_missions (
        mission_id VARCHAR(255) PRIMARY KEY,
        mission_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'created',
        priority INTEGER DEFAULT 0,
        payload JSONB NOT NULL DEFAULT '{}',
        result JSONB,
        assigned_to VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        error TEXT,
        retries INTEGER DEFAULT 0,
        retry_at TIMESTAMPTZ,
        lease_until TIMESTAMPTZ,
        claimed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_pm_status ON ping_missions(status);
      CREATE INDEX IF NOT EXISTS idx_pm_type ON ping_missions(mission_type);
      CREATE INDEX IF NOT EXISTS idx_pm_priority ON ping_missions(priority DESC);
      CREATE INDEX IF NOT EXISTS idx_pm_assigned ON ping_missions(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_pm_retry_at ON ping_missions(retry_at);
      CREATE INDEX IF NOT EXISTS idx_pm_lease_until ON ping_missions(lease_until);
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS hold_record JSONB;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS logical_operation_id VARCHAR(255);
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS effect_count INTEGER DEFAULT 0;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS outcome VARCHAR(50) DEFAULT 'UNKNOWN';
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS retry_eligibility BOOLEAN DEFAULT TRUE;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS reconciliation_required BOOLEAN DEFAULT FALSE;
      -- Backfill for rows created before the proven-outcome columns existed.
      UPDATE ping_missions SET logical_operation_id = mission_id WHERE logical_operation_id IS NULL;
    `);
  }

  /**
   * Create a new mission.
   *
   * mission_id is deterministic: hash(missionType:event_id) when event_id is
   * present in payload, otherwise hash(missionType:canonical_payload). Same
   * event always produces the same mission — idempotent by construction.
   * ON CONFLICT DO NOTHING prevents duplicate missions for the same event.
   *
   * logical_operation_id is set to mission_id at creation: one mission row IS
   * one logical operation, and retries / SAFE_TO_RETRY re-attempts reuse the
   * row, so the identity is stable across HOLD, restarts, and re-attempts by
   * construction. It is never reminted.
   */
  async create(missionType, payload = {}, options = {}) {
    const crypto = require('crypto');
    const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
    const idempotencyKey = payload.event_id
      ? `${missionType}:${payload.event_id}`
      : `${missionType}:${JSON.stringify(payload)}`;
    const missionId = crypto.createHash('sha256')
      .update(idempotencyKey)
      .digest('hex').slice(0, 16);

    const result = await this._pool.query(
      `INSERT INTO ping_missions (mission_id, mission_type, payload, priority, created_by, logical_operation_id, outcome, retry_eligibility)
       VALUES ($1, $2, $3, $4, $5, $1, 'UNKNOWN', TRUE)
       ON CONFLICT (mission_id) DO NOTHING`,
      [missionId, missionType, JSON.stringify(payload), options.priority || 0, options.createdBy || null]
    );

    const created = (result.rowCount || 0) === 1;

    if (created && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_CREATED', 'mission-runtime', {
        missionId, missionType, payload, priority: options.priority || 0,
      });
    }

    return missionId;
  }

  /**
   * Assign (claim) a mission to a worker.
   *
   * P0-1: conditional transition. Claim state, claimed_at and lease_until are
   * set in the SAME mutation, and the UPDATE only matches missions still in
   * status 'created' AND retry_eligible. A second claim on an already-claimed
   * mission is rejected (rowCount 0) — the assignment can never be stolen by
   * a concurrent scheduler. HOLD missions carry retry_eligibility = FALSE, so
   * the ordinary scheduler cannot claim them even if their status were ever
   * mis-set: non-dispatchability is structural, not just a status check.
   *
   * @returns {Promise<number>} rowCount — 1 if claimed, 0 if not claimable
   */
  async assign(missionId, workerName) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'assigned', assigned_to = $1, claimed_at = NOW(), lease_until = NOW() + INTERVAL '60 seconds' WHERE mission_id = $2 AND status = 'created' AND retry_eligibility = TRUE RETURNING mission_id`,
      [workerName, missionId]
    );

    const claimed = (result.rowCount || 0) === 1;

    if (claimed && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_ASSIGNED', 'mission-runtime', {
        missionId, assignedTo: workerName,
      });
    }

    return result.rowCount || 0;
  }

  /**
   * Start a mission.
   *
   * Conditional: only transitions from 'assigned' to 'running'. A mission
   * that is already completed, failed, or retry_pending is never restarted.
   */
  async start(missionId) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'running', started_at = NOW() WHERE mission_id = $1 AND status = 'assigned'`,
      [missionId]
    );

    if ((result.rowCount || 0) === 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_STARTED', 'mission-runtime', { missionId });
    }
  }

  /**
   * Record a dispatch attempt — the effect-count half of the HOLD invariant.
   *
   * Called by the scheduler at the moment the worker is actually invoked
   * (after the conditional claim + start). effect_count is conservative: the
   * invocation MAY have produced the external effect, so the count goes up
   * even when the outcome is ambiguous. Only reconciliation evidence may move
   * it back down (proven non-occurrence → 0). Conditional on status
   * 'running': attempts are only counted for claimed-and-started missions.
   *
   * @param {string} missionId
   * @returns {Promise<number|null>} new effect_count, or null if not countable
   */
  async recordDispatchAttempt(missionId) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET effect_count = effect_count + 1 WHERE mission_id = $1 AND status = 'running' RETURNING effect_count`,
      [missionId]
    );
    return (result.rowCount || 0) === 1 ? result.rows[0].effect_count : null;
  }

  /**
   * Complete a mission.
   *
   * Conditional: only transitions from 'running' to 'completed'. A mission
   * that is failed, retry_pending, or already completed is never overwritten.
   */
  async complete(missionId, result = {}) {
    // Calculate duration from started_at
    let duration_ms = null;
    try {
      const row = await this._pool.query(
        `SELECT started_at FROM ping_missions WHERE mission_id = $1`,
        [missionId]
      );
      if (row.rows[0] && row.rows[0].started_at) {
        duration_ms = Date.now() - new Date(row.rows[0].started_at).getTime();
      }
    } catch (_) {}

    const updateResult = await this._pool.query(
      `UPDATE ping_missions SET status = 'completed', result = $1, completed_at = NOW(), outcome = 'SUCCEEDED', reconciliation_required = FALSE WHERE mission_id = $2 AND status = 'running'`,
      [JSON.stringify({ ...result, duration_ms }), missionId]
    );

    if ((updateResult.rowCount || 0) === 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime', { missionId, result, duration_ms });
    }
  }

  /**
   * Fail a mission.
   *
   * Only reachable for proven failures (see MissionScheduler._failMission).
   * HOLD rows are excluded: a HOLD is never failed by automatic machinery —
   * only reconcileHold('failed') with proven-failure evidence may do that.
   */
  async fail(missionId, error) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'failed', error = $1, completed_at = NOW(), outcome = 'FAILED'
       WHERE mission_id = $2 AND status IN ('running', 'assigned', 'retry_pending')`,
      [error, missionId]
    );

    if ((result.rowCount || 0) >= 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_FAILED', 'mission-runtime', { missionId, error });
    }
  }

  /**
   * Fail with retry — P0-4.
   *
   * Increments `retries`, sets `retry_pending` status and `retry_at` to enforce
   * a backoff gate.  When `retries >= max_attempts`, the mission is marked
   * `failed` instead (exhaustion).
   *
   * `getPending()` only returns `created` missions, so retry_pending missions
   * are invisible until `retry_at` is reached and `reclaimRetryPending()`
   * moves them back to `created` through the normal conditional-claim path.
   * The `retries` counter is never reset by a reclaim: every failure advances
   * it, so retries are bounded and exhaustion is always reachable (F-01).
   *
   * @param {string} missionId
   * @param {string} error — error description
   * @param {object} options
   * @param {number} options.max_attempts — total attempts before exhaustion (default 3)
   * @param {number} options.backoff_delay_ms — base delay before retry (default 5000)
   */
  async failWithRetry(missionId, error, options = {}) {
    const maxAttempts = options.max_attempts || 3;
    const backoffMs = options.backoff_delay_ms || 5000;

    // Read current retries
    const row = await this._pool.query(
      `SELECT retries FROM ping_missions WHERE mission_id = $1`,
      [missionId]
    );
    const currentRetries = (row.rows[0] && row.rows[0].retries) || 0;
    const nextRetry = currentRetries + 1;

    let affectedRows = 0;
    if (nextRetry >= maxAttempts) {
      // Exhausted — mark failed permanently
      const result = await this._pool.query(
        `UPDATE ping_missions SET status = 'failed', error = $1, retries = $2, completed_at = NOW(), outcome = 'FAILED'
         WHERE mission_id = $3 AND status IN ('running', 'assigned', 'retry_pending')`,
        [error, nextRetry, missionId]
      );
      affectedRows = result.rowCount || 0;
    } else {
      // Schedule retry. The IN-list deliberately includes 'retry_pending': a
      // failure recorded against an already-retry_pending row must still
      // advance the attempt counter (state progress). Without it the UPDATE
      // matches zero rows and the mission re-executes forever with retries
      // frozen — the F-01 infinite loop.
      const retryAt = new Date(Date.now() + backoffMs);
      const result = await this._pool.query(
        `UPDATE ping_missions SET status = 'retry_pending', error = $1, retries = $2, retry_at = $3
         WHERE mission_id = $4 AND status IN ('running', 'assigned', 'retry_pending')`,
        [error, nextRetry, retryAt.toISOString(), missionId]
      );
      affectedRows = result.rowCount || 0;
    }

    if (affectedRows >= 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_FAILED', 'mission-runtime', { missionId, error, retries: nextRetry });
    }

    return nextRetry;
  }

  /**
   * Renew a lease for a mission still being processed by the scheduler.
   *
   * Extends lease_until by `durationSeconds` from now. Only renews missions
   * still in 'running' or 'assigned' status — completed/failed missions are
   * untouched. Called by the scheduler on each poll cycle for every mission
   * in its _processing set, preventing the reaper from resetting in-progress
   * missions while still catching orphaned ones from crashed schedulers.
   *
   * @param {string} missionId
   * @param {number} durationSeconds — lease extension (default 60)
   * @returns {Promise<number>} rowCount — 1 if renewed, 0 if not renewable
   */
  async renewLease(missionId, durationSeconds = 60) {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET lease_until = NOW() + INTERVAL '1 second' * $1
       WHERE mission_id = $2
         AND status IN ('running', 'assigned')
         AND lease_until IS NOT NULL`,
      [durationSeconds, missionId]
    );
    return result.rowCount || 0;
  }

  /**
   * Reclaim expired leases — P0-6, narrowed by the constitutional PARK/HOLD
   * rule (Nolan 2026-09-24).
   *
   * Reaps ONLY "abandoned, known not to have started": missions still in
   * 'assigned' whose worker was never invoked (started_at IS NULL) and whose
   * lease expired. They are reset to `created` (AVAILABLE) so the scheduler
   * can re-claim them.
   *
   * A mission that reached 'running' MAY have produced an external effect —
   * lease expiry NEVER turns it back into `created` (that was an automatic
   * retry of an unknown-outcome execution). Orphaned running missions are
   * escalated to HOLD by findOrphanedRunning() + the scheduler's reconciler,
   * never silently re-dispatched.
   *
   * @returns {Promise<number>} count of reclaimed missions
   */
  async reapExpiredLeases() {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NOW(), retry_eligibility = TRUE
       WHERE status = 'assigned'
         AND started_at IS NULL
         AND lease_until IS NOT NULL
         AND lease_until < NOW()
       RETURNING mission_id`
    );

    const reclaimed = result.rowCount || 0;
    if (reclaimed > 0) {
      console.log(`[MissionRuntime] Reclaimed ${reclaimed} expired lease(s)`);
      for (const row of result.rows) {
        if (this._eventRuntime) {
          await this._eventRuntime.emit('MISSION_LEASE_EXPIRED', 'mission-runtime', { missionId: row.mission_id });
        }
      }
    }

    return reclaimed;
  }

  /**
   * Find orphaned running missions — the "may have produced an external
   * effect" set (constitutional PARK/HOLD, Nolan 2026-09-24).
   *
   * Returns missions that reached `running` (started_at IS NOT NULL, so the
   * worker was invoked and the effect is unknown) whose lease expired without
   * renewal — i.e. no live scheduler owns them anymore. The caller (the
   * scheduler's reconciler) parks each as HOLD; they are NEVER reset to
   * `created` for silent re-dispatch.
   *
   * @returns {Promise<object[]>} mission rows
   */
  async findOrphanedRunning() {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions
       WHERE status IN ('running', 'assigned')
         AND started_at IS NOT NULL
         AND lease_until IS NOT NULL
         AND lease_until < NOW()
       ORDER BY lease_until ASC`
    );
    return result.rows;
  }

  /**
   * Park a mission as HOLD — the durable unknown-outcome state.
   *
   * Conditional transition running/assigned → hold. Carries the derived HOLD
   * record (from deriveFailureRecord: HOLD_RECONCILE / UNKNOWN_EXECUTION /
   * "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS") in hold_record, clears
   * the lease so no reaper or renewal ever touches the parked row again, and
   * publishes the proven outcome model: outcome UNKNOWN, retry_eligibility
   * FALSE (the ordinary scheduler cannot claim it), reconciliation_required
   * TRUE (reconciliation owns the next transition).
   *
   * The conditional WHERE is the cross-restart dedup guard: a second
   * reconciler finds status='hold' and parks zero rows. If the mission
   * already resolved (late completion/failed), zero rows park and the caller
   * must NOT emit a stale HOLD.
   *
   * @param {string} missionId
   * @param {object} holdRecord — derived failure record (JSON-serializable)
   * @returns {Promise<number>} rowCount — 1 if parked, 0 if not parkable
   */
  async parkHold(missionId, holdRecord) {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'hold', hold_record = $2::jsonb, lease_until = NULL,
           outcome = 'UNKNOWN', retry_eligibility = FALSE, reconciliation_required = TRUE
       WHERE mission_id = $1 AND status IN ('running', 'assigned')
       RETURNING mission_id`,
      [missionId, JSON.stringify(holdRecord || null)]
    );
    return result.rowCount || 0;
  }

  /**
   * Resolve a parked HOLD with evidence — the ONLY exit from `hold`.
   *
   * There is no automatic path here. The decision vocabulary is exactly the
   * CEO's four (no synonyms):
   *   - 'succeeded': reconciliation PROVED the effect happened. The mission
   *     completes with the recovered result; effect_count is unchanged
   *     (still 1 — no second execution).
   *   - 'failed': reconciliation PROVED failure. Terminal. This is never a
   *     timeout, lost acknowledgement, or unknown outcome — those stay HOLD.
   *   - 'safe_to_retry': retry is PROVEN safe. Requires options.evidence, a
   *     non-empty statement of WHY, AND the proof itself: either the effect
   *     was proven absent (options.effectProvenAbsent === true —
   *     effect_count is corrected to 0, so the next attempt brings it to
   *     exactly 1) or a proven idempotency contract for the exact operation
   *     (options.idempotencyContract, non-empty — effect_count kept: the
   *     effect may already have happened once). Evidence with neither proof
   *     is "probably safe" and throws.
   *     The mission re-enters `created` with the SAME logical_operation_id;
   *     the attempt counter is preserved (F-01).
   *   - 'hold': continued HOLD — reconciliation remains inconclusive. The
   *     row stays hold/UNKNOWN/reconciliation_required; the note is merged
   *     into hold_record for the next reconciler.
   * Any other decision string throws — no new vocabulary is invented here.
   *
   * @param {string} missionId
   * @param {string} decision — 'succeeded' | 'failed' | 'safe_to_retry' | 'hold'
   * @param {object} [options]
   * @param {*} [options.evidence] — required for 'succeeded' | 'failed' | 'safe_to_retry'
   * @param {boolean} [options.effectProvenAbsent] — for 'safe_to_retry': true when
   *   reconciliation proved the effect never happened (effect_count → 0)
   * @param {string} [options.note] — for 'hold': continuation note
   * @returns {Promise<boolean>} true if a hold was resolved, false if the
   *   mission was not in `hold`
   */
  async reconcileHold(missionId, decision, options = {}) {
    const hasEvidence = (v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return true;
    };
    const emitResolved = async (payload) => {
      if (this._eventRuntime) {
        await this._eventRuntime.emit('MISSION_HOLD_RESOLVED', 'mission-runtime', { missionId, ...payload });
      }
    };

    if (decision === 'succeeded') {
      if (!hasEvidence(options.evidence)) {
        throw new TypeError(
          'reconcileHold: decision "succeeded" requires evidence that the effect happened ' +
          '(options.evidence); a HOLD never completes on assumption'
        );
      }
      const result = await this._pool.query(
        `UPDATE ping_missions
         SET status = 'completed', result = $2::jsonb, completed_at = NOW(),
             outcome = 'SUCCEEDED', reconciliation_required = FALSE, retry_eligibility = FALSE
         WHERE mission_id = $1 AND status = 'hold'
         RETURNING mission_id`,
        [missionId, JSON.stringify({ reconciled: true, evidence: options.evidence })]
      );
      const resolved = (result.rowCount || 0) === 1;
      if (resolved) await emitResolved({ decision: 'succeeded' });
      return resolved;
    }
    if (decision === 'failed') {
      if (!hasEvidence(options.evidence)) {
        throw new TypeError(
          'reconcileHold: decision "failed" requires evidence of proven failure ' +
          '(options.evidence) — never a timeout, lost acknowledgement, or unknown outcome'
        );
      }
      const result = await this._pool.query(
        `UPDATE ping_missions
         SET status = 'failed', error = $2, completed_at = NOW(),
             outcome = 'FAILED', reconciliation_required = FALSE, retry_eligibility = FALSE
         WHERE mission_id = $1 AND status = 'hold'
         RETURNING mission_id`,
        [missionId, typeof options.evidence === 'string' ? options.evidence : JSON.stringify(options.evidence)]
      );
      const resolved = (result.rowCount || 0) === 1;
      if (resolved) await emitResolved({ decision: 'failed' });
      return resolved;
    }
    if (decision === 'safe_to_retry') {
      if (!hasEvidence(options.evidence)) {
        throw new TypeError(
          'reconcileHold: decision "safe_to_retry" requires evidence of WHY retry is safe ' +
          '(options.evidence): proof the effect never happened, or a proven idempotency ' +
          'contract for the exact operation. "Probably safe" is not enough for an ' +
          'unknown-outcome execution.'
        );
      }
      // The proof itself is mandatory and typed: either the effect was proven
      // absent (options.effectProvenAbsent === true) or a proven idempotency
      // contract for the exact operation was supplied
      // (options.idempotencyContract, non-empty). Bare belief — evidence with
      // neither — throws: an unknown-outcome execution is never re-executed
      // on "probably safe".
      const provenAbsent = options.effectProvenAbsent === true;
      const provenIdempotent = hasEvidence(options.idempotencyContract);
      if (!provenAbsent && !provenIdempotent) {
        throw new TypeError(
          'reconcileHold: decision "safe_to_retry" requires PROOF, not belief: pass ' +
          'options.effectProvenAbsent === true (reconciliation proved the effect never ' +
          'happened) or options.idempotencyContract (a proven idempotency contract for ' +
          'the exact operation). Evidence without either is "probably safe" and is rejected.'
        );
      }
      // Proven non-occurrence corrects the conservative effect_count to 0, so
      // the next attempt brings it to exactly 1. Idempotency-contract retries
      // keep the count: the effect may already have happened once.
      const effectCountSet = options.effectProvenAbsent === true ? ', effect_count = 0' : '';
      const result = await this._pool.query(
        `UPDATE ping_missions
         SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NULL,
             outcome = 'SAFE_TO_RETRY', retry_eligibility = TRUE, reconciliation_required = FALSE${effectCountSet}
         WHERE mission_id = $1 AND status = 'hold'
         RETURNING mission_id`,
        [missionId]
      );
      const resolved = (result.rowCount || 0) === 1;
      if (resolved) await emitResolved({ decision: 'safe_to_retry', effectProvenAbsent: options.effectProvenAbsent === true });
      return resolved;
    }
    if (decision === 'hold') {
      const note = options.note ? String(options.note) : 'reconciliation inconclusive — HOLD continued';
      const result = await this._pool.query(
        `UPDATE ping_missions
         SET hold_record = COALESCE(hold_record, '{}'::jsonb) || $2::jsonb
         WHERE mission_id = $1 AND status = 'hold'
         RETURNING mission_id`,
        [missionId, JSON.stringify({ continued_at: new Date().toISOString(), continuation_note: note })]
      );
      const resolved = (result.rowCount || 0) === 1;
      if (resolved) await emitResolved({ decision: 'hold', note });
      return resolved;
    }
    throw new TypeError(
      `reconcileHold: unknown decision '${decision}' ` +
      `(expected 'succeeded' | 'failed' | 'safe_to_retry' | 'hold')`
    );
  }

  /**
   * Get parked HOLD missions — the reconciliation backlog for Mission Control.
   */
  async getHolds() {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions WHERE status = 'hold' ORDER BY created_at ASC`
    );
    return result.rows;
  }

  /**
   * Reclaim due retries — the missing link of the retry contract (F-01 repair).
   *
   * Moves `retry_pending` missions whose `retry_at` backoff gate has elapsed
   * back to `created`, so they re-enter through the normal conditional-claim
   * path (assign → start → dispatch) instead of being dispatched directly.
   * The `retries` counter is NOT reset: attempt counting persists across
   * reclaims, so retries stay bounded and exhaustion stays reachable.
   *
   * @returns {Promise<number>} count of reclaimed missions
   */
  async reclaimRetryPending() {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NULL, retry_eligibility = TRUE
       WHERE status = 'retry_pending'
         AND retry_at IS NOT NULL
         AND retry_at <= NOW()
       RETURNING mission_id`
    );

    const reclaimed = result.rowCount || 0;
    if (reclaimed > 0) {
      console.log(`[MissionRuntime] Reclaimed ${reclaimed} due retries for redispatch`);
      for (const row of result.rows) {
        if (this._eventRuntime) {
          await this._eventRuntime.emit('MISSION_RETRY_RECLAIMED', 'mission-runtime', { missionId: row.mission_id });
        }
      }
    }

    return reclaimed;
  }

  /**
   * Find missions stuck in an active state beyond a bounded threshold.
   *
   * Returns missions in `running`/`assigned` whose last state progress
   * (`started_at`, else `claimed_at`, else `created_at`) is older than the
   * cutoff. Feeds the scheduler's stuck-running watchdog; the caller filters
   * out missions it is actively processing.
   *
   * @param {string} olderThanIso — ISO cutoff; missions older than this qualify
   * @returns {Promise<object[]>} mission rows
   */
  async findStuckRunning(olderThanIso) {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions
       WHERE status IN ('running', 'assigned')
         AND COALESCE(started_at, claimed_at, created_at) < $1
       ORDER BY created_at ASC`,
      [olderThanIso]
    );
    return result.rows;
  }

  /**
   * Get pending missions (for Orca scheduler).
   *
   * Returns missions in `created` status ONLY — and only when retry_eligible.
   * `retry_pending` missions are
   * invisible here by design: they re-enter through `reclaimRetryPending()`,
   * which enforces the `retry_at` backoff gate and routes them back through
   * the conditional claim (assign → start), so every attempt is counted and
   * retries stay bounded. Dispatching retry_pending rows directly bypassed
   * the claim guard and froze the retry counter — the F-01 infinite loop.
   * The retry_eligibility gate is the structural half of HOLD
   * non-dispatchability: a HOLD row can never satisfy it.
   */
  async getPending(limit = 10) {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions
       WHERE status = 'created' AND retry_eligibility = TRUE
       ORDER BY priority DESC, created_at ASC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get active missions.
   */
  async getActive() {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions WHERE status IN ('assigned', 'running') ORDER BY priority DESC`
    );
    return result.rows;
  }

  /**
   * Get mission stats.
   */
  async getStats() {
    const result = await this._pool.query(
      `SELECT status, COUNT(*) as count FROM ping_missions GROUP BY status`
    );
    const stats = {};
    for (const row of result.rows) {
      stats[row.status] = parseInt(row.count);
    }
    return { ...stats, scope: 'persistent' };
  }

  /**
   * Get full trace for a mission — evidence bundle.
   *
   * Resolves the correlation_id from the mission's triggering event (stored in
   * payload.event_id by EventToMissionBridge). All events in a causal chain
   * share the same correlation_id (preserved by BaseWorker._emit), so querying
   * by the triggering event's correlation_id returns the full chain.
   *
   * Previously queried by mission_id directly, which is a sha256 hash — never
   * equal to any event's correlation_id.
   */
  async getTrace(missionId) {
    const mission = await this._pool.query(
      `SELECT * FROM ping_missions WHERE mission_id = $1`,
      [missionId]
    );
    if (!mission.rows[0]) return null;

    const missionRow = mission.rows[0];
    const payload = typeof missionRow.payload === 'string'
      ? JSON.parse(missionRow.payload)
      : (missionRow.payload || {});

    // Resolve correlation_id from the triggering event's metadata.
    // The bridge stores event_id in payload; the triggering event carries
    // correlation_id in its metadata (set by UnifiedEventRuntime.emit).
    let correlationId = missionId; // fallback: query by mission_id if no event found
    if (payload.event_id) {
      const triggeringEvent = await this._pool.query(
        `SELECT metadata->>'correlation_id' AS cid FROM ping_events WHERE event_id = $1`,
        [payload.event_id]
      );
      if (triggeringEvent.rows[0]?.cid) {
        correlationId = triggeringEvent.rows[0].cid;
      } else {
        // Triggering event not in ping_events (pre-bridge or different store).
        // Fall back to using the event_id itself as correlation_id —
        // UnifiedEventRuntime defaults correlation_id to eventId when absent.
        correlationId = payload.event_id;
      }
    }

    const events = await this._pool.query(
      `SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1 ORDER BY timestamp ASC`,
      [correlationId]
    );

    return {
      mission: missionRow,
      correlation_id: correlationId,
      events: events.rows,
      eventCount: events.rowCount,
    };
  }

  /**
   * Get all traces — for evidence bundles.
   */
  async getAllTraces() {
    const missions = await this._pool.query(
      `SELECT * FROM ping_missions ORDER BY created_at ASC`
    );
    const traces = [];
    for (const m of missions.rows) {
      const trace = await this.getTrace(m.mission_id);
      if (trace) traces.push(trace);
    }
    return traces;
  }
}

module.exports = { MissionRuntime };
