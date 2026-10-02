/**
 * Event Repository
 * 
 * Constitutional repository for event history (replay support).
 * 
 * Handles repository_events table for event sourcing and replay.
 * 
 * PATCH_002: Moved to runtime/kernel/
 */

const { CanonicalBytes, CanonicalAuthority } = require('./authorities/canonical_authority');
const { runtimeIdentityAuthority } = require('./authorities/runtime_identity_authority');
const { constitutionalTimeAuthority } = require('./authorities/constitutional_time_authority');

class EventRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS repository_events (
          event_id TEXT PRIMARY KEY,
          object_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          payload JSONB NOT NULL,
          witness JSONB,
          timestamp BIGINT NOT NULL,
          authority TEXT NOT NULL,
          authority_version TEXT NOT NULL,
          causation_id TEXT,
          correlation_id TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          -- Phase 36 PATCH 2 Refinement: Uppercase constitutional field names
          RuntimeID TEXT NOT NULL,
          PreviousEventHash TEXT,
          CanonicalEventHash TEXT NOT NULL,
          ReducerHash TEXT,
          WitnessHash TEXT,
          ReplayHash TEXT,
          chain_root TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_repo_events_object ON repository_events(object_id);
        CREATE INDEX IF NOT EXISTS idx_repo_events_sequence ON repository_events(object_id, sequence);
        CREATE INDEX IF NOT EXISTS idx_repo_events_type ON repository_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_repo_events_timestamp ON repository_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_repo_events_runtime ON repository_events(RuntimeID);
        CREATE INDEX IF NOT EXISTS idx_repo_events_chain ON repository_events(object_id, sequence, CanonicalEventHash);
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS event_processing (
          event_id TEXT PRIMARY KEY REFERENCES repository_events(event_id),
          processed BOOLEAN NOT NULL DEFAULT FALSE,
          processed_at TIMESTAMPTZ,
          worker TEXT NOT NULL DEFAULT 'unknown',
          retries INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_event_processing_processed ON event_processing(processed);
        CREATE INDEX IF NOT EXISTS idx_event_processing_worker ON event_processing(worker);
      `);
    } finally {
      client.release();
    }
  }

  async markProcessed(eventId, worker) {
    await this.pool.query(`
      INSERT INTO event_processing (event_id, processed, processed_at, worker, retries)
      VALUES ($1, TRUE, NOW(), $2, 0)
      ON CONFLICT (event_id) DO UPDATE SET
        processed = TRUE, processed_at = NOW(), worker = $2, retries = event_processing.retries
    `, [eventId, worker]);
  }

  async markFailed(eventId, worker, error) {
    await this.pool.query(`
      INSERT INTO event_processing (event_id, processed, processed_at, worker, retries, last_error)
      VALUES ($1, FALSE, NOW(), $2, 1, $3)
      ON CONFLICT (event_id) DO UPDATE SET
        processed = FALSE, processed_at = NOW(), worker = $2,
        retries = event_processing.retries + 1, last_error = $3
    `, [eventId, worker, error]);
  }

  async getUnprocessedEventIds(limit) {
    const result = await this.pool.query(`
      SELECT e.event_id FROM repository_events e
      LEFT JOIN event_processing ep ON e.event_id = ep.event_id
      WHERE ep.event_id IS NULL
      ORDER BY e.timestamp ASC
      LIMIT $1
    `, [limit || 100]);
    return result.rows.map(r => r.event_id);
  }

  async appendEvent(event, options = {}) {
    // Phase 36 PATCH 2 Refinement: Use uppercase constitutional field names
    const runtimeId = event.RuntimeID || runtimeIdentityAuthority.getRuntimeId();
    const canonicalEventHash = event.CanonicalEventHash;
    const previousHash = event.PreviousEventHash || await this._getPreviousHash(event.object_id, event.sequence);
    const reducerHash = event.ReducerHash || null;
    const witnessHash = event.WitnessHash;
    const replayHash = event.ReplayHash;
    const chainRoot = this._computeChainRoot(previousHash, canonicalEventHash);
    
    // Phase 36 PATCH 7: Use ConstitutionalTimeAuthority instead of DB NOW()
    const createdAt = constitutionalTimeAuthority.now();
    const queryClient = options.client || this.pool;

    await queryClient.query(`
      INSERT INTO repository_events (
        event_id, object_id, event_type, aggregate_type, sequence,
        payload, witness, timestamp, authority, authority_version,
        causation_id, correlation_id, created_at, RuntimeID, PreviousEventHash, CanonicalEventHash, ReducerHash, WitnessHash, ReplayHash, chain_root
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      event.event_id,
      event.object_id,
      event.event_type,
      event.aggregate_type,
      event.sequence,
      JSON.stringify(event.payload),
      event.witness ? JSON.stringify(event.witness) : null,
      event.timestamp,
      event.authority,
      event.authority_version,
      event.causation_id,
      event.correlation_id,
      createdAt,
      runtimeId,
      previousHash,
      canonicalEventHash,
      reducerHash,
      witnessHash,
      replayHash,
      chainRoot
    ]);
  }

  /**
   * Get previous event hash for chain linking
   * Phase 36 PATCH 2 Refinement: Use uppercase field name
   * @param {string} objectId - Object ID
   * @param {number} sequence - Current sequence number
   * @returns {Promise<string|null>} Previous hash or null for first event
   */
  async _getPreviousHash(objectId, sequence) {
    if (sequence <= 1) {
      return null; // First event in chain
    }
    const result = await this.pool.query(
      'SELECT CanonicalEventHash FROM repository_events WHERE object_id = $1 AND sequence = $2',
      [objectId, sequence - 1]
    );
    return result.rows.length > 0 ? result.rows[0].canonicaleventhash : null;
  }

  /**
   * Compute chain root from previous hash and current event hash
   * Phase 36 PATCH 2
   * @param {string|null} previousHash - Previous event hash
   * @param {string} eventHash - Current event hash
   * @returns {string} Chain root hash
   */
  _computeChainRoot(previousHash, eventHash) {
    if (!previousHash) {
      return eventHash; // First event
    }
    return CanonicalAuthority.hashChain([previousHash, eventHash]);
  }

  async getEvents(objectId) {
    const result = await this.pool.query(
      'SELECT * FROM repository_events WHERE object_id = $1 ORDER BY sequence ASC',
      [objectId]
    );
    return result.rows.map(r => this._rowToEvent(r));
  }

  async getEventsByType(eventType) {
    const result = await this.pool.query(
      'SELECT * FROM repository_events WHERE event_type = $1 ORDER BY timestamp DESC',
      [eventType]
    );
    return result.rows.map(r => this._rowToEvent(r));
  }

  _rowToEvent(row) {
    // Phase 36C: Close Persistence Surface - deserialize through CanonicalBytes
    return {
      event_id: row.event_id,
      object_id: row.object_id,
      event_type: row.event_type,
      aggregate_type: row.aggregate_type,
      sequence: row.sequence,
      payload: row.payload,
      witness: row.witness,
      timestamp: row.timestamp,
      authority: row.authority,
      authority_version: row.authority_version,
      causation_id: row.causation_id,
      correlation_id: row.correlation_id,
      created_at: row.created_at,
      // Phase 36 PATCH 2 Refinement: Uppercase constitutional field names
      RuntimeID: row.runtimeid,
      PreviousEventHash: row.previouseventhash,
      CanonicalEventHash: row.canonicaleventhash,
      ReducerHash: row.reducerhash,
      WitnessHash: row.witnesshash,
      ReplayHash: row.replayhash,
      chain_root: row.chain_root
    };
  }
}

module.exports = { EventRepository };
