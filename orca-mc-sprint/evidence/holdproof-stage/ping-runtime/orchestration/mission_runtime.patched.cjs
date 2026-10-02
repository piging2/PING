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
 * Mission Control navigates these via events/queues, not CRUD.
 */

// W3 MISSION tenant binding. Missions carry an immutable tenant_id set at
// creation from trusted execution context (options.tenant_id). Missing or
// invalid tenant fails closed (throws); it is never defaulted from, and never
// taken from, the mission payload (spoof surface). Tenant joins the
// idempotency key so the same event_id in two tenants never collides into
// ON CONFLICT DO NOTHING silence.
const MISSION_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

function requireMissionTenantId(tenantId) {
  if (typeof tenantId !== 'string' || !MISSION_TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error('MissionRuntime: valid options.tenant_id is required (tenant isolation fail-closed)');
  }
  return tenantId;
}

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
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
      UPDATE ping_missions SET tenant_id = 'UNKNOWN' WHERE tenant_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_pm_tenant_id ON ping_missions(tenant_id);
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS hold_at TIMESTAMPTZ;
      ALTER TABLE ping_missions ADD COLUMN IF NOT EXISTS hold_reason TEXT;
      CREATE INDEX IF NOT EXISTS idx_pm_hold_at ON ping_missions(hold_at);
    `);
  }

  /**
   * Resolve a mission's tenant_id for lifecycle events (HOLD/retry/reaper
   * paths preserve tenant context by re-reading the immutable row value).
   * @private
   */
  async _missionTenant(missionId) {
    if (!this._pool) return null;
    const row = await this._pool.query(
      `SELECT tenant_id FROM ping_missions WHERE mission_id = $1`,
      [missionId]
    );
    return (row.rows[0] && row.rows[0].tenant_id) || null;
  }

  /**
   * Create a new mission.
   *
   * mission_id is deterministic: hash(tenant:missionType:event_id) when
   * event_id is present in payload, otherwise hash(tenant:missionType:
   * canonical_payload). Tenant joins the key: the same event_id in two
   * tenants is two missions, never an ON CONFLICT silence. Same
   * (tenant, event) always produces the same mission — idempotent by
   * construction. options.tenant_id is REQUIRED (fail closed).
   */
  async create(missionType, payload = {}, options = {}) {
    const tenantId = requireMissionTenantId(options.tenant_id);
    const crypto = require('crypto');
    const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
    const idempotencyKey = payload.event_id
      ? `${tenantId}:${missionType}:${payload.event_id}`
      : `${tenantId}:${missionType}:${JSON.stringify(payload)}`;
    const missionId = crypto.createHash('sha256')
      .update(idempotencyKey)
      .digest('hex').slice(0, 16);

    const result = await this._pool.query(
      `INSERT INTO ping_missions (mission_id, mission_type, payload, priority, created_by, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mission_id) DO NOTHING`,
      [missionId, missionType, JSON.stringify(payload), options.priority || 0, options.createdBy || null, tenantId]
    );

    const created = (result.rowCount || 0) === 1;

    if (created && this._eventRuntime) {
      await this._eventRuntime.emit('MISSION_CREATED', 'mission-runtime', {
        missionId, missionType, payload, priority: options.priority || 0,
      }, { tenant_id: tenantId });
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
      `UPDATE ping_missions SET status = 'assigned', assigned_to = $1, claimed_at = NOW(), lease_until = NOW() + INTERVAL '60 seconds' WHERE mission_id = $2 AND status = 'created' AND hold_at IS NULL RETURNING mission_id`,
      [workerName, missionId]
    );

    const claimed = (result.rowCount || 0) === 1;

    if (claimed && this._eventRuntime) {
      const tenantId = await this._missionTenant(missionId);
      await this._eventRuntime.emit('MISSION_ASSIGNED', 'mission-runtime', {
        missionId, assignedTo: workerName,
      }, tenantId ? { tenant_id: tenantId } : {});
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
      const tenantId = await this._missionTenant(missionId);
      await this._eventRuntime.emit('MISSION_STARTED', 'mission-runtime', { missionId },
        tenantId ? { tenant_id: tenantId } : {});
    }
  }

  /**
   * Complete a mission.
   *
   * Conditional: transitions from 'running' to 'completed', and also
   * completes a HELD mission in a holdable non-running status ('assigned',
   * 'created'). A mission that is failed, retry_pending, or already
   * completed is never overwritten, and a mission whose hold was already
   * resolved is not touched by the held-row disjunct.
   *
   * E3 H3 repair (2026-09-27): the held-row disjunct lets a late worker ack
   * land on a mission the C1-recovery path re-held as 'created' (or held in
   * 'assigned'). Without it the ack matched 0 rows and the hold was
   * permanent by construction: the held-resolution sweep only resolves
   * status='completed' rows. `hold_at IS NOT NULL` scopes the disjunct to
   * the live hold episode (only resolveHold clears hold_at), so a stale ack
   * can never complete a mission an operator already released: after
   * PROVEN_NOT_OCCURRED the row is 'created' with hold_at NULL and the ack
   * still matches 0 rows, exactly as before.
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
      `UPDATE ping_missions SET status = 'completed', result = $1, completed_at = NOW() WHERE mission_id = $2 AND (status = 'running' OR (hold_at IS NOT NULL AND status IN ('assigned', 'created')))`,
      [JSON.stringify({ ...result, duration_ms }), missionId]
    );

    if ((updateResult.rowCount || 0) === 1 && this._eventRuntime) {
      const tenantId = await this._missionTenant(missionId);
      await this._eventRuntime.emit('MISSION_COMPLETED', 'mission-runtime', { missionId, result, duration_ms },
        tenantId ? { tenant_id: tenantId } : {});
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
      const tenantId = await this._missionTenant(missionId);
      await this._eventRuntime.emit('MISSION_FAILED', 'mission-runtime', { missionId, error },
        tenantId ? { tenant_id: tenantId } : {});
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
        `UPDATE ping_missions SET status = 'failed', error = $1, retries = $2, completed_at = NOW()
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
      const tenantId = await this._missionTenant(missionId);
      await this._eventRuntime.emit('MISSION_FAILED', 'mission-runtime', { missionId, error, retries: nextRetry },
        tenantId ? { tenant_id: tenantId } : {});
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
   * HOLD CONSTITUTIONAL (locked 2026-09-27): missions with hold_at IS NOT
   * NULL are NEVER reclaimed. A lease expiring is evidence that ownership of
   * execution became stale — it is not evidence that an external effect did
   * not occur. UNKNOWN EFFECT -> HOLD -> RECONCILE -> NEVER LEASE-EXPIRY
   * REDISPATCH. Only the reconciler moves a mission out of HOLD (resolveHold).
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
         AND hold_at IS NULL
       RETURNING mission_id`
    );

    const reclaimed = result.rowCount || 0;
    if (reclaimed > 0) {
      console.log(`[MissionRuntime] Reclaimed ${reclaimed} expired lease(s)`);
      for (const row of result.rows) {
        if (this._eventRuntime) {
          const tenantId = await this._missionTenant(row.mission_id);
          await this._eventRuntime.emit('MISSION_LEASE_EXPIRED', 'mission-runtime', { missionId: row.mission_id },
            tenantId ? { tenant_id: tenantId } : {});
        }
      }
    }

    return reclaimed;
  }

  /**
   * Mark a mission HOLD — durable record of an unknown-outcome reconciliation.
   *
   * Written by the reconciler (MissionScheduler._reconcileUnknown) when an
   * attempt's outcome is UNKNOWN (dispatch timeout, no result, stuck worker).
   * Sets hold_at, which makes the mission non-dispatchable across the whole
   * dispatch-eligibility surface: reapExpiredLeases, reclaimRetryPending,
   * getPending and assign all exclude held missions.
   *
   * Conditional and idempotent: only matches un-held rows in a holdable
   * status. HOLD is an overlay on dispatch eligibility, not a lifecycle
   * status — the row keeps its status. HOLD's meaning is unchanged
   * (UNKNOWN EFFECT -> HOLD -> RECONCILE); this only makes the record durable
   * so the reaper can honor it.
   *
   * E2 RACE REPAIR (2026-09-27): the holdable statuses include 'created' so
   * the hold still lands when reapExpiredLeases() won the commit race and
   * already reclaimed the row to 'created' before this UPDATE ran. Without
   * this, the reaper-wins interleaving matched 0 rows and the mission was
   * silently re-dispatched (C1 falsification). markHold remains the ONLY
   * writer of hold_at.
   *
   * @returns {Promise<number>} 1 if the hold was recorded, 0 if already held or not holdable
   */
  async markHold(missionId, reason) {
    const result = await this._pool.query(
      `UPDATE ping_missions SET hold_at = NOW(), hold_reason = $2
       WHERE mission_id = $1 AND status IN ('running', 'assigned', 'created') AND hold_at IS NULL`,
      [missionId, reason || null]
    );
    return result.rowCount || 0;
  }

  /**
   * Resolve a HOLD — the ONLY way a mission leaves HOLD.
   *
   * Owned by the reconciler. Callers: the reconciler's held-resolution sweep
   * (MissionScheduler.reconcileHeldMissions) for PROVEN_OCCURRED, and
   * operator/external-verifier callers holding genuine proof for
   * PROVEN_NOT_OCCURRED / MANUAL_RESOLUTION. Resolutions (anything else
   * throws, fail closed):
   *   PROVEN_OCCURRED     — the external effect did occur: adopt the durable
   *                         result and move to 'completed'. Never re-dispatches.
   *   PROVEN_NOT_OCCURRED — the effect provably did not occur: clear the hold
   *                         and return to 'created' for exactly one new safe
   *                         attempt through the normal conditional claim. All
   *                         attempt-clock fields are reset (started_at,
   *                         claimed_at, lease_until, assigned_to, retry_at):
   *                         without the started_at reset, findStuckRunning's
   *                         COALESCE(started_at, claimed_at, created_at) would
   *                         flag the freshly re-claimed mission as stuck on
   *                         the stale started_at and spuriously re-hold it
   *                         (E2 STARTED_AT repair).
   *   MANUAL_RESOLUTION   — operator-determined terminal state; recorded in
   *                         result, never re-dispatched.
   * Each branch is conditional on hold_at IS NOT NULL: resolving a mission
   * that is not held is a no-op. Emits no events: the reconciler's own
   * MISSION_RECONCILE_HOLD record plus its resolution record are the evidence
   * trail; the row state is the dispatch-eligibility truth.
   *
   * HOLD LIFECYCLE: UNKNOWN EFFECT -> markHold (durable) ->
   * MISSION_RECONCILE_HOLD -> held (invisible to reaper/reclaim/pending/
   * assign/watchdog) -> resolveHold -> terminal, or exactly one new attempt.
   *
   * @returns {Promise<number>} 1 if a hold was resolved, 0 if the mission was not held
   */
  async resolveHold(missionId, resolution, result = {}) {
    if (!['PROVEN_OCCURRED', 'PROVEN_NOT_OCCURRED', 'MANUAL_RESOLUTION'].includes(resolution)) {
      throw new Error(`MissionRuntime.resolveHold: unknown resolution '${resolution}' (fail closed)`);
    }
    let sql;
    let params;
    if (resolution === 'PROVEN_OCCURRED') {
      sql = `UPDATE ping_missions SET hold_at = NULL, hold_reason = NULL, status = 'completed',
               result = $2, completed_at = NOW()
             WHERE mission_id = $1 AND hold_at IS NOT NULL`;
      params = [missionId, JSON.stringify({ ...result, hold_resolution: resolution })];
    } else if (resolution === 'PROVEN_NOT_OCCURRED') {
      // E2 STARTED_AT repair: started_at is an attempt-clock field. Without
      // this reset, findStuckRunning's COALESCE(started_at, claimed_at,
      // created_at) outranks the fresh claimed_at with the stale started_at,
      // so the freshly re-claimed mission is immediately re-flagged stuck
      // and spuriously re-held. The retries counter is deliberately NOT
      // reset (F-01: retries stay bounded toward exhaustion).
      sql = `UPDATE ping_missions SET hold_at = NULL, hold_reason = NULL, status = 'created',
               assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NULL,
               started_at = NULL
             WHERE mission_id = $1 AND hold_at IS NOT NULL`;
      params = [missionId];
    } else {
      sql = `UPDATE ping_missions SET hold_at = NULL, hold_reason = NULL, status = 'completed',
               result = $2, completed_at = NOW()
             WHERE mission_id = $1 AND hold_at IS NOT NULL`;
      params = [missionId, JSON.stringify({ ...result, hold_resolution: resolution, manual: true })];
    }
    const r = await this._pool.query(sql, params);
    return r.rowCount || 0;
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
       SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL, retry_at = NULL
       WHERE status = 'retry_pending'
         AND retry_at IS NOT NULL
         AND retry_at <= NOW()
         AND hold_at IS NULL
       RETURNING mission_id`
    );

    const reclaimed = result.rowCount || 0;
    if (reclaimed > 0) {
      console.log(`[MissionRuntime] Reclaimed ${reclaimed} due retries for redispatch`);
      for (const row of result.rows) {
        if (this._eventRuntime) {
          const tenantId = await this._missionTenant(row.mission_id);
          await this._eventRuntime.emit('MISSION_RETRY_RECLAIMED', 'mission-runtime', { missionId: row.mission_id },
            tenantId ? { tenant_id: tenantId } : {});
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
         AND hold_at IS NULL
       ORDER BY created_at ASC`,
      [olderThanIso]
    );
    return result.rows;
  }

  /**
   * Point-read a mission row by id — no state change.
   *
   * Used by the reconciler's race-recovery path (_reconcileUnknown): when
   * markHold affects 0 rows, the reconciler re-reads the row to handle its
   * ACTUAL state instead of acting on a stale snapshot. Read-only; never
   * moves a mission.
   *
   * @returns {Promise<object|null>} the mission row, or null if absent
   */
  async getMission(missionId) {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions WHERE mission_id = $1`,
      [missionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find held missions — feeds the reconciler's held-resolution sweep.
   *
   * Returns missions with hold_at IS NOT NULL, oldest hold first. Held
   * missions are invisible to every dispatch-eligibility path (reap, reclaim,
   * pending, assign, watchdog); this is the reconciler's work list for
   * proving outcomes and resolving holds via resolveHold — the ONLY exit
   * from HOLD.
   *
   * @param {number} [limit] — max rows (default 100)
   * @returns {Promise<object[]>} held mission rows
   */
  async findHeld(limit = 100) {
    const result = await this._pool.query(
      `SELECT * FROM ping_missions WHERE hold_at IS NOT NULL ORDER BY hold_at ASC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get pending missions (for Orca scheduler).
   *
   * Returns missions in `created` status ONLY. `retry_pending` missions are
   * invisible here by design: they re-enter through `reclaimRetryPending()`,
   * which enforces the `retry_at` backoff gate and routes them back through
   * the conditional claim (assign → start), so every attempt is counted and
   * retries stay bounded. Dispatching retry_pending rows directly bypassed
   * the claim guard and froze the retry counter — the F-01 infinite loop.
   *
   * HOLD CONSTITUTIONAL (locked 2026-09-27): held missions (hold_at IS NOT
   * NULL) are never pending, even if a row ever sits in 'created' with a
   * hold. Only resolveHold clears the hold.
   */
  async getPending(limit = 10, tenantId = null) {
    if (tenantId === null) {
      const result = await this._pool.query(
        `SELECT * FROM ping_missions
         WHERE status = 'created'
           AND hold_at IS NULL
         ORDER BY priority DESC, created_at ASC LIMIT $1`,
        [limit]
      );
      return result.rows;
    }
    const tenant = requireMissionTenantId(tenantId);
    const result = await this._pool.query(
      `SELECT * FROM ping_missions
       WHERE status = 'created' AND tenant_id = $2
         AND hold_at IS NULL
       ORDER BY priority DESC, created_at ASC LIMIT $1`,
      [limit, tenant]
    );
    return result.rows;
  }

  /**
   * Get active missions. tenantId scopes the query; null = all (system use).
   */
  async getActive(tenantId = null) {
    if (tenantId === null) {
      const result = await this._pool.query(
        `SELECT * FROM ping_missions WHERE status IN ('assigned', 'running') ORDER BY priority DESC`
      );
      return result.rows;
    }
    const tenant = requireMissionTenantId(tenantId);
    const result = await this._pool.query(
      `SELECT * FROM ping_missions WHERE status IN ('assigned', 'running') AND tenant_id = $1 ORDER BY priority DESC`,
      [tenant]
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
