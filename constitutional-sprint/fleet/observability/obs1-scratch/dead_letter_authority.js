/**
 * Dead Letter Authority
 * 
 * Phase A2.3 — Constitutional Dead Letter Authority
 * 
 * Centralized authority for failed jobs that cannot be retried.
 * 
 * Never silently discard failures.
 * 
 * Flow:
 * FAILED
 * ↓
 * DeadLetterAuthority
 * ↓
 * repository_dead_letters
 * ↓
 * Witness
 * ↓
 * Replay
 * 
 * Every dead letter includes:
 * - original_job_id
 * - job_type
 * - failure_reason
 * - failure_timestamp
 * - retry_count
 * - original_payload
 * - error_details
 * - witness
 * - replayable (boolean)
 */

const { CanonicalBytes } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { witnessAuthority } = require('./witness_authority');
const { RetryPolicy } = require('./retry_policy');
const { identityAuthority } = require('../ping-runtime/authorities/identity_authority.js');

class DeadLetterAuthority {
  constructor(postgresPool) {
    this._postgres = postgresPool;
    this._isInitialized = false;
  }

  /**
   * Initialize dead letter tables
   */
  async initialize() {
    if (this._isInitialized) {
      return;
    }

    const client = await this._postgres.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS repository_dead_letters (
          dead_letter_id TEXT PRIMARY KEY,
          original_job_id TEXT NOT NULL,
          job_type TEXT NOT NULL,
          mission_id TEXT,
          execution_id TEXT,
          correlation_id TEXT,
          causation_id TEXT,
          authority TEXT NOT NULL,
          authority_version TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          dead_lettered_at BIGINT NOT NULL,
          retry_count INTEGER NOT NULL,
          payload JSONB NOT NULL,
          error_message TEXT NOT NULL,
          error_stack TEXT,
          error_code TEXT,
          failure_reason TEXT NOT NULL,
          replayable BOOLEAN NOT NULL DEFAULT true,
          witness JSONB,
          witness_hash TEXT,
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Indexes for querying
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_dead_letters_job_type ON repository_dead_letters(job_type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_dead_letters_mission ON repository_dead_letters(mission_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_dead_letters_replayable ON repository_dead_letters(replayable)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_dead_letters_created ON repository_dead_letters(dead_lettered_at)
      `);

      this._isInitialized = true;
      console.log('[DeadLetterAuthority] Initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Record a dead letter
   * @param {Object} job - Original job
   * @param {Error} error - Error that caused failure
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Dead letter ID
   */
  async recordDeadLetter(job, error, options = {}) {
    const deadLetterId = identityAuthority.generateDeadLetterId(job.job_id);
    const now = constitutionalTimeAuthority.nowAsMillis();
    
    // Use RetryPolicy for failure classification
    const retryPolicy = RetryPolicy.forJobType(job.job_type);
    const failureReason = retryPolicy.determineFailureReason(error);
    const replayable = retryPolicy.isReplayable(error);

    const deadLetter = {
      dead_letter_id: deadLetterId,
      original_job_id: job.job_id,
      job_type: job.job_type,
      mission_id: job.mission_id,
      execution_id: job.execution_id,
      correlation_id: job.correlation_id,
      causation_id: job.causation_id,
      authority: job.authority,
      authority_version: job.authority_version,
      created_at: job.created_at,
      dead_lettered_at: now,
      retry_count: job.retry_count,
      payload: job.payload,
      error_message: error.message,
      error_stack: error.stack,
      error_code: error.code,
      failure_reason: failureReason,
      replayable: replayable,
      metadata: CanonicalBytes.serialize(options.metadata || {})
    };

    // Create witness (WitnessAuthority handles hashing internally)
    const witness = witnessAuthority.createWitness(deadLetter, {
      authority: 'DeadLetterAuthority',
      authority_version: '1.0.0',
      job_type: job.job_type
    });

    deadLetter.witness = witness;
    deadLetter.witness_hash = witness.witness_metadata?.hash;

    await this._postgres.query(`
      INSERT INTO repository_dead_letters (
        dead_letter_id, original_job_id, job_type, mission_id, execution_id,
        correlation_id, causation_id, authority, authority_version,
        created_at, dead_lettered_at, retry_count, payload,
        error_message, error_stack, error_code, failure_reason,
        replayable, witness, witness_hash, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      deadLetter.dead_letter_id,
      deadLetter.original_job_id,
      deadLetter.job_type,
      deadLetter.mission_id,
      deadLetter.execution_id,
      deadLetter.correlation_id,
      deadLetter.causation_id,
      deadLetter.authority,
      deadLetter.authority_version,
      deadLetter.created_at,
      deadLetter.dead_lettered_at,
      deadLetter.retry_count,
      deadLetter.payload,
      deadLetter.error_message,
      deadLetter.error_stack,
      deadLetter.error_code,
      deadLetter.failure_reason,
      deadLetter.replayable,
      CanonicalBytes.serialize(witness),
      deadLetter.witness_hash,
      deadLetter.metadata
    ]);

    console.error(`[DeadLetterAuthority] Recorded dead letter ${deadLetterId} for job ${job.job_id}: ${failureReason}`);

    return deadLetterId;
  }

  /**
   * Get dead letter by ID
   * @param {string} deadLetterId - Dead letter ID
   * @returns {Promise<Object|null>} Dead letter or null
   */
  async getDeadLetter(deadLetterId) {
    const result = await this._postgres.query(`
      SELECT * FROM repository_dead_letters
      WHERE dead_letter_id = $1
    `, [deadLetterId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this._rowToDeadLetter(result.rows[0]);
  }

  /**
   * Get dead letters by job type
   * @param {string} jobType - Job type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Dead letters
   */
  async getDeadLettersByJobType(jobType, options = {}) {
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const replayableOnly = options.replayableOnly !== false;

    let query = `
      SELECT * FROM repository_dead_letters
      WHERE job_type = $1
    `;
    const params = [jobType];
    let paramIndex = 2;

    if (replayableOnly) {
      query += ` AND replayable = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }

    query += ` ORDER BY dead_lettered_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this._postgres.query(query, params);

    return result.rows.map(row => this._rowToDeadLetter(row));
  }

  /**
   * Get dead letters by mission
   * @param {string} missionId - Mission ID
   * @returns {Promise<Array>} Dead letters
   */
  async getDeadLettersByMission(missionId) {
    const result = await this._postgres.query(`
      SELECT * FROM repository_dead_letters
      WHERE mission_id = $1
      ORDER BY dead_lettered_at DESC
    `, [missionId]);

    return result.rows.map(row => this._rowToDeadLetter(row));
  }

  /**
   * Replay a dead letter
   * @param {string} deadLetterId - Dead letter ID
   * @param {Function} replayFn - Replay function
   * @returns {Promise<Object>} Replay result
   */
  async replayDeadLetter(deadLetterId, replayFn) {
    const deadLetter = await this.getDeadLetter(deadLetterId);
    
    if (!deadLetter) {
      throw new Error(`Dead letter not found: ${deadLetterId}`);
    }

    if (!deadLetter.replayable) {
      throw new Error(`Dead letter is not replayable: ${deadLetterId}`);
    }

    try {
      const result = await replayFn(deadLetter);

      // Mark as replayed
      await this._markAsReplayed(deadLetterId);

      return result;
    } catch (error) {
      // Update dead letter with replay failure
      await this._updateReplayFailure(deadLetterId, error);
      throw error;
    }
  }

  /**
   * Get dead letter statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const result = await this._postgres.query(`
      SELECT 
        job_type,
        failure_reason,
        replayable,
        COUNT(*) as count
      FROM repository_dead_letters
      GROUP BY job_type, failure_reason, replayable
    `);

    const stats = {
      byJobType: {},
      byFailureReason: {},
      total: 0,
      replayable: 0,
      nonReplayable: 0
    };

    for (const row of result.rows) {
      // By job type
      if (!stats.byJobType[row.job_type]) {
        stats.byJobType[row.job_type] = 0;
      }
      stats.byJobType[row.job_type] += parseInt(row.count);

      // By failure reason
      if (!stats.byFailureReason[row.failure_reason]) {
        stats.byFailureReason[row.failure_reason] = 0;
      }
      stats.byFailureReason[row.failure_reason] += parseInt(row.count);

      // Replayable counts
      if (row.replayable) {
        stats.replayable += parseInt(row.count);
      } else {
        stats.nonReplayable += parseInt(row.count);
      }

      stats.total += parseInt(row.count);
    }

    return stats;
  }

  /**
   * Clean old dead letters
   * @param {number} daysToKeep - Days to keep
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanOldDeadLetters(daysToKeep = 30) {
    const cutoffTime = constitutionalTimeAuthority.nowAsMillis() - (daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this._postgres.query(`
      DELETE FROM repository_dead_letters
      WHERE dead_lettered_at < $1
      AND replayable = false
    `, [cutoffTime]);

    console.log(`[DeadLetterAuthority] Cleaned ${result.rowCount} old dead letters`);
    return result.rowCount;
  }

  /**
   * Mark dead letter as replayed
   * @param {string} deadLetterId - Dead letter ID
   */
  async _markAsReplayed(deadLetterId) {
    await this._postgres.query(`
      UPDATE repository_dead_letters
      SET replayable = false,
          metadata = metadata || jsonb_build_object('replayed_at', $1::text)
      WHERE dead_letter_id = $2
    `, [constitutionalTimeAuthority.nowAsMillis(), deadLetterId]);
  }

  /**
   * Update replay failure
   * @param {string} deadLetterId - Dead letter ID
   * @param {Error} error - Replay error
   */
  async _updateReplayFailure(deadLetterId, error) {
    await this._postgres.query(`
      UPDATE repository_dead_letters
      SET metadata = metadata || jsonb_build_object(
        'replay_failed_at', $1::text,
        'replay_error', $2,
        'replay_count', COALESCE((metadata->>'replay_count')::int, 0) + 1
      )
      WHERE dead_letter_id = $3
    `, [constitutionalTimeAuthority.nowAsMillis(), error.message, deadLetterId]);
  }

  /**
   * Convert row to dead letter object
   * @param {Object} row - Database row
   * @returns {Object} Dead letter
   */
  _rowToDeadLetter(row) {
    return {
      dead_letter_id: row.dead_letter_id,
      original_job_id: row.original_job_id,
      job_type: row.job_type,
      mission_id: row.mission_id,
      execution_id: row.execution_id,
      correlation_id: row.correlation_id,
      causation_id: row.causation_id,
      authority: row.authority,
      authority_version: row.authority_version,
      created_at: row.created_at,
      dead_lettered_at: row.dead_lettered_at,
      retry_count: row.retry_count,
      payload: row.payload,
      error_message: row.error_message,
      error_stack: row.error_stack,
      error_code: row.error_code,
      failure_reason: row.failure_reason,
      replayable: row.replayable,
      witness: row.witness,
      witness_hash: row.witness_hash,
      metadata: row.metadata
    };
  }
}

module.exports = { DeadLetterAuthority };
