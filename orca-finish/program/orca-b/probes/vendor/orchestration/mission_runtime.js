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
   * @returns {Promise<number>} rowCount — 1 if claimed, 0 if not claimable
   */
  async assign(missionId, workerName) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET status = 'assigned', assigned_to = $1, claimed_at = NOW(), lease_until = NOW() + INTERVAL '60 seconds' WHERE mission_id = $2 AND status = 'created' RETURNING mission_id`,
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
      `UPDATE ping_missions SET status = 'completed', result = $1, completed_at = NOW() WHERE mission_id = $2 AND status = 'running'`,
      [JSON.stringify({ ...result, duration_ms }), missionId]
    );

    if ((updateResult.rowCount || 0) === 1 && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime', { missionId, result, duration_ms });
    }
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
   * `getPending()` only returns `created` missions, so retry_pending missions
   * are invisible until `retry_at` is reached and `reclaimRetryPending()`
   * moves them back to `created` (or until `reapExpiredLeases()` picks them up
   * if retry_at has passed).
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
