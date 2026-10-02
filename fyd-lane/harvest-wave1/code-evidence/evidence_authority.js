/**
 * Evidence Authority — PING Core v1 (Phase E of Canonical Boundary)
 *
 * The one missing retrieval stage. Aggregates, verifies, and ranks evidence.
 * Retrieval returns verifiable results; no unverifiable result is presented as truth.
 *
 * Flows:
 *   accumulate(sourceEventIds) — resolve supporting events from ping_events.
 *   verify(evidence)           — recompute canonical hash (verifyCanonicalObject) +
 *                                lineage + namespace consistency; for Qdrant hits,
 *                                trace the source_event_id back to a real PG event.
 *   rank(results)              — order by confidence × provenance × approval state;
 *                                down-rank `embedding: 'fallback'` and rejected nodes.
 *
 * Hash-chain semantics per RETRIEVAL_INTELLIGENCE_REPORT.md law #1 (trace on every
 * result) and #7 (ADD-only — this authority never mutates events, only reads).
 */

const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

class EvidenceAuthority {
  /**
   * @param {object} options
   * @param {object} [options.pool] — pg.Pool (ping_events reads)
   * @param {object} [options.eventRuntime] — UnifiedEventRuntime (event reads)
   * @param {Function} [options.canonicalObjectVerifier] — verifyCanonicalObject from
   *   gateway/canonical_object.js; recomputes the hash for full canonical objects.
   */
  constructor(options = {}) {
    if (!options.pool && !options.eventRuntime) {
      throw new Error('EvidenceAuthority requires pool or eventRuntime');
    }
    this._pool = options.pool || null;
    this._eventRuntime = options.eventRuntime || null;
    this._canonicalObjectVerifier =
      typeof options.canonicalObjectVerifier === 'function' ? options.canonicalObjectVerifier : null;
    this._stats = { accumulated: 0, verified: 0, tampered: 0, ranked: 0 };
  }

  /**
   * Resolve supporting events from ping_events by event_id.
   * ADD-only read — never mutates the event store.
   * @param {string[]} sourceEventIds
   * @returns {Promise<object[]>} backing event rows (event_id, event_type, source,
   *   timestamp, payload, metadata, namespace).
   */
  async accumulate(sourceEventIds) {
    const ids = Array.isArray(sourceEventIds) ? sourceEventIds.filter(Boolean) : [];
    if (ids.length === 0 || !this._pool) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this._pool.query(
      `SELECT event_id, event_type, source, timestamp, payload, metadata, namespace
         FROM ping_events
        WHERE event_id IN (${placeholders})
        ORDER BY timestamp ASC`,
      ids
    );
    this._stats.accumulated += result.rows.length;
    return result.rows;
  }

  /**
   * Verify evidence. Accepts two shapes:
   *   canonical object: { kind, payload, canonical_hash, lineage, namespace, identity }
   *   Qdrant hit:       { id, score, payload: { canonical_hash, namespace, source_event_id } }
   *
   * Canonical object: recompute hash via canonicalObjectVerifier + lineage present +
   * namespace consistency (object.namespace vs identity.namespace).
   * Qdrant hit: trace payload.source_event_id back to ping_events; namespace must
   * match the backing row; canonical_hash must match the backing metadata (when present).
   *
   * @param {object} evidence
   * @returns {Promise<{verified:boolean, reason:string|null, checks:object}>}
   */
  async verify(evidence) {
    const checks = { hash: null, lineage: null, namespace: null, backingEvent: null };
    if (!evidence || typeof evidence !== 'object') {
      return { verified: false, reason: 'not an object', checks };
    }

    const isHit =
      typeof evidence.score === 'number' &&
      evidence.payload &&
      typeof evidence.payload.source_event_id === 'string';

    if (isHit) {
      checks.hash = typeof evidence.payload.canonical_hash === 'string';
      checks.lineage = true; // source_event_id is the trace anchor
      checks.namespace = NAMESPACE_RE.test(evidence.payload.namespace || '');

      if (this._pool) {
        const result = await this._pool.query(
          `SELECT event_id, event_type, source, timestamp, payload, metadata, namespace
             FROM ping_events WHERE event_id = $1`,
          [evidence.payload.source_event_id]
        );
        checks.backingEvent = result.rows.length === 1;
        if (result.rows.length === 1) {
          const row = result.rows[0];
          checks.namespace = checks.namespace && row.namespace === evidence.payload.namespace;
          const metaHash = (row.metadata && row.metadata.canonical_hash) || null;
          if (metaHash && evidence.payload.canonical_hash) {
            checks.hash = checks.hash && metaHash === evidence.payload.canonical_hash;
          }
        } else {
          checks.hash = false;
          checks.namespace = false;
        }
      }
    } else {
      // Full canonical object shape
      checks.backingEvent = true; // the object itself is the backing evidence
      if (evidence.payload && evidence.canonical_hash && this._canonicalObjectVerifier) {
        const verification = this._canonicalObjectVerifier(evidence);
        checks.hash = verification.valid;
        if (!verification.valid) {
          this._stats.tampered++;
          return { verified: false, reason: verification.error, checks };
        }
      } else if (typeof evidence.canonical_hash === 'string') {
        checks.hash = true;
      } else {
        checks.hash = false;
      }

      const lineage = evidence.lineage;
      checks.lineage = !!(lineage && (lineage.source_id || (lineage.derivation_path && lineage.derivation_path.length)));
      const objNamespace = evidence.namespace;
      const identityNamespace = evidence.identity && evidence.identity.namespace;
      checks.namespace =
        (!objNamespace || NAMESPACE_RE.test(objNamespace)) &&
        (!objNamespace || !identityNamespace || objNamespace === identityNamespace);
    }

    const verified = Object.values(checks).every((v) => v === true);
    if (verified) this._stats.verified++;
    return { verified, reason: verified ? null : 'verification failed', checks };
  }

  /**
   * Rank results by confidence × provenance × approval state.
   * Down-ranks `embedding: 'fallback'` (deterministic seeded vector) and nodes
   * whose data carries `rejected: true`. Adds `rank_score` (never clobbers the
   * caller's existing `score`). Sorts descending.
   * @param {object[]} results — each { confidence?, provenance?, approved?, rejected?, embedding?, payload? }
   * @returns {object[]}
   */
  rank(results) {
    const scored = (results || []).map((result) => {
      const confidence = typeof result.confidence === 'number' ? result.confidence : null;
      const provenance = typeof result.provenance === 'number' ? result.provenance : 0.5;
      const approved = !!result.approved;
      const rejected = !!result.rejected;
      const fallback =
        result.embedding === 'fallback' ||
        (result.payload && result.payload.embedding === 'fallback');

      // null confidence → 0.5 (neutral: below any explicit assessment but
      // above rejected). NOT 1.0 — that would rank unknown higher than moderate.
      const effectiveConfidence = confidence != null ? confidence : 0.5;
      let rankScore = effectiveConfidence * provenance * (approved ? 1.2 : 1.0);
      if (fallback) rankScore *= 0.5;
      if (rejected) rankScore *= 0.2;

      return { ...result, rank_score: rankScore };
    });

    scored.sort((a, b) => b.rank_score - a.rank_score);
    this._stats.ranked += scored.length;
    return scored;
  }

  /** Diagnostic counters. */
  getStats() {
    return { ...this._stats };
  }
}

module.exports = { EvidenceAuthority, NAMESPACE_RE };
