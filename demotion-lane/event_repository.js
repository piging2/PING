/**
 * Event Repository
 * 
 * Constitutional repository for event history (replay support).
 * 
 * Handles repository_events table for event sourcing and replay.
 * 
 * PATCH_002: Moved to runtime/kernel/
 *
 * DEMOTION (2026-09-19, event-authority convergence): this module is a
 * PROJECTION/ADAPTER, not an event authority. appendEvent() now carries a
 * fail-closed code gate: every new repository_events write must reference
 * an event already accepted into ping_events (proof of prior acceptance
 * by the UnifiedEventRuntime, the sole canonical event authority).
 * Missing or unverifiable prior acceptance throws
 * UnanchoredCanonicalWriteError (code EVENT_REPOSITORY_UNANCHORED_WRITE)
 * before any repository insert. Historical repository_events rows,
 * tables, and hash-chain behavior are preserved; no destructive migration,
 * no ID rewrites.
 */

const { CanonicalBytes, CanonicalAuthority } = require('./authorities/canonical_authority');
const { runtimeIdentityAuthority } = require('./authorities/runtime_identity_authority');
const { constitutionalTimeAuthority } = require('./authorities/constitutional_time_authority');

/**
 * Typed error for writes that lack proof of prior canonical acceptance.
 *
 * Thrown fail-closed by EventRepository.appendEvent when the caller cannot
 * reference an event already accepted into ping_events, or when prior
 * acceptance cannot be verified. No repository row is inserted in either
 * case.
 */
class UnanchoredCanonicalWriteError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'UnanchoredCanonicalWriteError';
    this.code = 'EVENT_REPOSITORY_UNANCHORED_WRITE';
    this.retryable = false;
    this.detail = detail;
  }
}

class EventRepository {
  constructor(pool) {
    this.pool = pool;
    // Canonical journal table consulted by the acceptance gate. The
    // UnifiedEventRuntime is the sole writer/owner of ping_events.
    this.acceptedEventStoreTable = 'ping_events';
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

  /**
   * Resolve the canonical event id the caller claims this repository write
   * derives from.
   *
   * Carriers, in precedence order:
   *   1. options.canonicalEventId (explicit proof carrier);
   *   2. event.canonical_event_id (explicit claim);
   *   3. event.correlation_id (legacy correlation claim).
   *
   * The raw event.event_id is intentionally NOT a carrier: repository-local
   * ids (evt_*) are not canonical event identities.
   *
   * @returns {string|null}
   */
  _resolveCanonicalEventId(event, options = {}) {
    if (options.canonicalEventId) return options.canonicalEventId;
    if (event.canonical_event_id) return event.canonical_event_id;
    if (event.correlation_id) return event.correlation_id;
    return null;
  }

  /**
   * Verify the claimed canonical event was already accepted into
   * ping_events by the UnifiedEventRuntime.
   *
   * Fail-closed: a missing claim, a non-matching claim, a missing query
   * client, or an unverifiable acceptance (lookup error) all throw
   * UnanchoredCanonicalWriteError before any repository insert. An
   * infrastructure failure is never treated as proof of acceptance.
   */
  async _verifyCanonicalAcceptance(queryClient, canonicalEventId) {
    if (!queryClient || typeof queryClient.query !== 'function') {
      throw new UnanchoredCanonicalWriteError(
        '[EventRepository] cannot verify prior acceptance: no query client ' +
        'available for the acceptance lookup against ping_events (fail-closed)',
        { reason: 'no_query_client' }
      );
    }
    if (!canonicalEventId) {
      throw new UnanchoredCanonicalWriteError(
        '[EventRepository] refusing repository write: no canonical event id ' +
        'carried by the caller; every repository_events row must derive from ' +
        'an already-accepted canonical event in ping_events (fail-closed). ' +
        'Provide options.canonicalEventId, event.canonical_event_id, or ' +
        'event.correlation_id referencing an accepted canonical event_id.',
        { reason: 'missing_canonical_reference' }
      );
    }
    let accepted;
    try {
      accepted = await queryClient.query(
        `SELECT 1 AS accepted FROM ${this.acceptedEventStoreTable} WHERE event_id = $1 LIMIT 1`,
        [canonicalEventId]
      );
    } catch (lookupError) {
      throw new UnanchoredCanonicalWriteError(
        '[EventRepository] refusing repository write: prior acceptance of ' +
        `'${canonicalEventId}' could not be verified against ping_events ` +
        `(${(lookupError && lookupError.message) || lookupError}); ` +
        'infrastructure failure is not proof of acceptance (fail-closed)',
        { reason: 'acceptance_unverifiable', canonicalEventId }
      );
    }
    if (!accepted || !accepted.rows || accepted.rows.length === 0) {
      throw new UnanchoredCanonicalWriteError(
        '[EventRepository] refusing repository write: no already-accepted ' +
        `canonical event '${canonicalEventId}' exists in ping_events; ` +
        'repository rows must derive from events accepted by the ' +
        'UnifiedEventRuntime (fail-closed)',
        { reason: 'no_prior_acceptance', canonicalEventId }
      );
    }
  }

  async appendEvent(event, options = {}) {
    // Event-authority convergence gate (2026-09-19): the repository is a
    // projection/adapter, not an event authority. Every new
    // repository_events write must reference an event already accepted into
    // ping_events by the UnifiedEventRuntime. Fail closed on missing or
    // unverifiable prior acceptance; no repository insert happens after a
    // failed gate.
    const queryClient = options.client || this.pool;
    const canonicalEventId = this._resolveCanonicalEventId(event, options);
    await this._verifyCanonicalAcceptance(queryClient, canonicalEventId);

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

module.exports = { EventRepository, UnanchoredCanonicalWriteError };
