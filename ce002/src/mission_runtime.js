/**
 * Mission Runtime — PING Core v1
 * 
 * Single canonical mission system. Missions are work units dispatched by Orca,
 * executed by workers, tracked here. Replaces 12 dead mission implementations.
 * 
 * Mission lifecycle: created → assigned → running → completed/failed → archived
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
        claimed_at TIMESTAMPTZ,
        attempts INTEGER NOT NULL DEFAULT 1
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
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;
    `);
  }

  /**
   * Create a new mission.
   *
   * mission_id is deterministic: hash(missionType:event_id) when event_id is
   * present in payload, otherwise hash(missionType:canonical_payload). Same
   * event always produces the same mission — idempotent by construction.
   * ON CONFLICT DO NOTHING prevents duplicate missions for the same event.
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
      `INSERT INTO ping_missions (mission_id, mission_type, payload, priority, created_by)
       VALUES ($1, $2, $3, $4, $5)
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
   * status 'created'. A second claim on an already-claimed mission is rejected
   * (rowCount 0) — the assignment can never be stolen by a concurrent scheduler.
   *
   * CE-002: the same atomic UPDATE also mints the fencing token for this
   * lease grant: attempts = attempts + 1. The bumped value is the token the
   * winning worker must present to complete(); a superseded attempt's late
   * completion fails closed (see complete()). Lease renewal does NOT bump
   * attempts: renewing extends the same grant; only a new grant (after
   * reclaim back to 'created') mints a new token.
   *
   * @returns {Promise<number>} rowCount — 1 if claimed, 0 if not claimable
   */
  async assign(missionId, workerName) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'assigned', assigned_to = $1, claimed_at = NOW(), lease_until = NOW() + INTERVAL '60 seconds', attempts = attempts + 1 WHERE mission_id = $2 AND status = 'created' RETURNING mission_id`,
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
   * CE-002: read the fencing token for a mission's current lease grant.
   *
   * The token is the attempts counter value minted by the winning assign().
   * Call this after a successful assign()/start() and present the token to
   * complete(). Reading it in a separate SELECT is safe: attempts changes
   * only inside assign()'s conditional UPDATE (which requires status
   * 'created'), so between our winning claim and this read no other grant
   * can interleave: the row we claimed is 'assigned', not 'created'.
   *
   * @param {string} missionId
   * @returns {Promise<number|null>} the current fencing token, or null when
   *   the mission does not exist or the value is not a usable token
   */
  async getFencingToken(missionId) {
    const row = await this._pool.query(
      `SELECT attempts FROM ping_missions WHERE mission_id = $1`,
      [missionId]
    );
    const v = row.rows[0] && row.rows[0].attempts;
    return (typeof v === 'number' && Number.isInteger(v) && v > 0) ? v : null;
  }

  /**
   * Start a mission.
   *
   * Conditional: only transitions from 'assigned' to 'running', and only
   * for the worker that won the atomic claim (assigned_to must match).
   * A mission claimed by another worker - or already completed, failed,
   * or retry_pending - is never started by this caller. O4 repair
   * (2026-09-18): the loser of a claim race must not advance the mission.
   *
   * @returns {Promise<number>} rowCount - 1 if started, 0 if not startable by this worker
   */
  async start(missionId, workerName) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'running', started_at = NOW() WHERE mission_id = $1 AND status = 'assigned' AND assigned_to = $2`,
      [missionId, workerName]
    );

    const started = result.rowCount || 0;
    if (started === 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_STARTED', 'mission-runtime', { missionId });
    }
    return started;
  }

  /**
   * Complete a mission (CE-002 attempt-fenced).
   *
   * The caller must present the fencing token minted by its winning claim
   * (see assign() and getFencingToken()). The conditional UPDATE requires
   * attempts = fencingToken, so a superseded attempt's late complete() can
   * never win the row transition:
   *   - missing or invalid token -> fail closed with STALE_ATTEMPT before
   *     any write; nothing is emitted.
   *   - token != current attempts while the mission is running -> fail
   *     closed with STALE_ATTEMPT; the row is untouched, nothing is emitted.
   *   - mission not running (already completed, failed, never started) ->
   *     legacy no-op; never a second emit (preserves the CE-001
   *     at-least-once redelivery semantics).
   *
   * The accepted completion carries payload.attempt naming the attempt that
   * produced it. The deterministic completion identity (CE-001) is
   * attempt-blind by design; the payload field is attribution metadata,
   * not identity material.
   *
   * @param {string} missionId
   * @param {object} result
   * @param {number} fencingToken: token from the winning claim
   * @returns {Promise<object>} { status: 'ok', completed: true, attempt } on
   *   acceptance; { status: 'stale', code: 'STALE_ATTEMPT', completed: false,
   *   reason } on fail-closed; { status: 'noop', completed: false, reason }
   *   when the mission is not running.
   */
  async complete(missionId, result = {}, fencingToken) {
    if (!Number.isInteger(fencingToken) || fencingToken <= 0) {
      return {
        status: 'stale',
        code: 'STALE_ATTEMPT',
        completed: false,
        reason: 'missing-or-invalid-fencing-token',
      };
    }

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
      `UPDATE ping_missions SET status = 'completed', result = $1, completed_at = NOW() WHERE mission_id = $2 AND status = 'running' AND attempts = $3`,
      [JSON.stringify({ ...result, duration_ms }), missionId, fencingToken]
    );

    if ((updateResult.rowCount || 0) === 1 && this._eventRuntime) {
      await this._eventRuntime.emit(
        'MISSION_COMPLETED',
        'mission-runtime',
        { missionId, result, duration_ms, attempt: fencingToken },
        {
          // CE-001: clock-free deterministic completion identity. duration_ms
          // and completed_at stay in the payload as observation metadata only;
          // they no longer feed the identity preimage. IdentityAuthority
          // remains the sole minter; no historical event_id is reminted.
          logical_id: MissionRuntime.completionLogicalId(missionId),
        }
      );
    }

    if ((updateResult.rowCount || 0) === 1) {
      return { status: 'ok', completed: true, attempt: fencingToken };
    }

    // The conditional UPDATE matched nothing. Distinguish a superseded
    // attempt (fail closed, typed) from a mission that is simply not
    // running (legacy no-op: no second emit either way).
    let diagStatus = null;
    let diagAttempts = null;
    try {
      const diag = await this._pool.query(
        `SELECT status, attempts FROM ping_missions WHERE mission_id = $1`,
        [missionId]
      );
      if (diag.rows[0]) {
        diagStatus = diag.rows[0].status;
        diagAttempts = diag.rows[0].attempts;
      }
    } catch (_) {}
    if (diagStatus === 'running' && diagAttempts !== fencingToken) {
      return {
        status: 'stale',
        code: 'STALE_ATTEMPT',
        completed: false,
        reason: 'superseded-attempt',
        presentedAttempt: fencingToken,
        currentAttempt: diagAttempts,
      };
    }
    return {
      status: 'noop',
      completed: false,
      reason: diagStatus ? `not-running:${diagStatus}` : 'unknown-mission',
    };
  }

  /**
   * CE-001: deterministic completion-identity material for a mission.
   *
   * The completion identity of a mission is a pure function of the
   * mission_id: the same logical completion yields the same completion
   * identity (the event_id of the MISSION_COMPLETED event) across retry,
   * lease expiry, restart, crash-after-accept, and reconciliation.
   * Single source of the logical_id shape for both the emit call site in
   * complete() and the startup reconciler below.
   *
   * @param {string} missionId
   * @returns {{kind: string, mission_id: string}}
   */
  static completionLogicalId(missionId) {
    return { kind: 'mission-completion', mission_id: missionId };
  }

  /**
   * CE-001: reconcile completion events lost to crash-after-accept.
   *
   * Finds missions in 'completed' status with no MISSION_COMPLETED event
   * (the emit was lost between the DB UPDATE and the event persist, e.g. a
   * crash) and re-emits the completion. The re-emission is keyed by the
   * deterministic completion identity, so it is a dedup no-op when the
   * event already exists or when a concurrent emit wins the race:
   * idempotent by construction. The re-emitted payload is reconstructed
   * from the stored row result so it is canonical-equivalent to what
   * complete() emitted (the result without the folded-in duration_ms, plus
   * duration_ms as its sibling, plus the attempt: exactly the complete()
   * emit shape).
   *
   * CE-002 reconciler decision (explicit): the reconciler is the privileged
   * recovery path, NOT an attempt, so it presents no fencing token and is
   * not subject to attempt validation. It never transitions lifecycle
   * state and never mints a new completion; it only ensures the journal
   * carries the completion the accepted attempt already persisted. It
   * re-emits with the row's own attempts value, which equals the attempt
   * complete() wrote (attempts cannot change after completion: reclaim and
   * re-claim only match running/assigned/created rows), so the re-emission
   * is canonical-equivalent under the collision gate and dedups against
   * the original emit. Requiring a token here would force the reconciler
   * to claim a lease (a new authority action, larger than the smallest
   * unit) for zero additional safety.
   *
   * @returns {Promise<{checked: number, reEmitted: number, alreadyPresent: number}>}
   */
  async reconcileLostCompletions() {
    const report = { checked: 0, reEmitted: 0, alreadyPresent: 0 };
    if (!this._pool || !this._eventRuntime) return report;
    const { identityAuthority } = require('../authorities/identity_authority.js');
    const rows = await this._pool.query(
      `SELECT mission_id, result, attempts FROM ping_missions WHERE status = 'completed'`
    );
    for (const row of (rows.rows || [])) {
      report.checked++;
      const missionId = row.mission_id;
      // Deterministic completion identity. This material must stay in sync
      // with the identity material built by UnifiedEventRuntime.emit() step 1
      // for the MISSION_COMPLETED emit in complete(): event_type, source, the
      // default namespace 'core::system' (complete() passes no namespace
      // option), and the logical_id above.
      const eventId = identityAuthority.generateId('event', {
        event_type: 'MISSION_COMPLETED',
        source: 'mission-runtime',
        namespace: 'core::system',
        logical_id: MissionRuntime.completionLogicalId(missionId),
      });
      const existing = await this._pool.query(
        `SELECT 1 AS one FROM ping_events WHERE event_id = $1`,
        [eventId]
      );
      if ((existing.rows || []).length > 0) {
        report.alreadyPresent++;
        continue;
      }
      const stored = row.result || {};
      const { duration_ms, ...rest } = stored;
      await this._eventRuntime.emit(
        'MISSION_COMPLETED',
        'mission-runtime',
        { missionId, result: rest, duration_ms: duration_ms == null ? null : duration_ms, attempt: row.attempts },
        { logical_id: MissionRuntime.completionLogicalId(missionId) }
      );
      report.reEmitted++;
    }
    return report;
  }

  /**
   * Fail a mission.
   */
  async fail(missionId, error) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'failed', error = $1, completed_at = NOW()
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
   * `getPending()` returns `created` missions and due `retry_pending`
   * missions. Due retries are moved back to `created` by
   * `reclaimRetryPending()` (called each scheduler poll before dispatch),
   * so every retry attempt goes through the atomic claim lifecycle and
   * `retries` increments toward exhaustion.
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
        `UPDATE ping_missions SET status = 'failed', error = $1, retries = $2, completed_at = NOW()
         WHERE mission_id = $3 AND status IN ('running', 'assigned', 'retry_pending')`,
        [error, nextRetry, missionId]
      );
      affectedRows = result.rowCount || 0;
    } else {
      // Schedule retry
      const retryAt = new Date(Date.now() + backoffMs);
      const result = await this._pool.query(
        `UPDATE ping_missions SET status = 'retry_pending', error = $1, retries = $2, retry_at = $3
         WHERE mission_id = $4 AND status IN ('running', 'assigned')`,
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
   * Reclaim expired leases — P0-6.
   *
   * Finds missions with status IN ('running', 'assigned') whose `lease_until`
   * has passed, resets them to `created` (AVAILABLE) so the scheduler can
   * re-claim them. Only catches missions NOT being actively renewed by the
   * scheduler (orphans from crashed schedulers or stuck workers beyond the
   * lease renewal window).
   *
   * @returns {Promise<number>} count of reclaimed missions
   */
  async reapExpiredLeases() {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NOW()
       WHERE status IN ('running', 'assigned')
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
   * Reclaim due retries - O3 repair (2026-09-18).
   *
   * Moves `retry_pending` missions whose `retry_at` has elapsed back to
   * `created` so the scheduler re-claims them through the normal atomic
   * claim lifecycle (created -> assigned -> running). Without this step,
   * due retries were dispatched without a claim: failWithRetry's retry
   * branch (status IN ('running','assigned')) matched zero rows, `retries`
   * never incremented, exhaustion was unreachable, and the mission
   * hot-looped forever instead of reaching `failed` + dead-letter.
   * Single conditional UPDATE: the atomicity unit is the row.
   *
   * @returns {Promise<number>} count of reclaimed missions
   */
  async reclaimRetryPending() {
    const result = await this._pool.query(
      "UPDATE ping_missions SET status = 'created' WHERE status = 'retry_pending' AND retry_at IS NOT NULL AND retry_at <= NOW()"
    );
    const reclaimed = result.rowCount || 0;
    if (reclaimed > 0) {
      console.log('[MissionRuntime] Reclaimed ' + reclaimed + ' due retries');
    }
    return reclaimed;
  }

  /**
   * Get pending missions (for Orca scheduler).
   *
   * Returns missions in `created` status AND `retry_pending` missions whose
   * `retry_at` has elapsed — both are claimable.
   */
  async getPending(limit = 10) {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions
       WHERE status = 'created'
          OR (status = 'retry_pending' AND retry_at IS NOT NULL AND retry_at <= NOW())
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
