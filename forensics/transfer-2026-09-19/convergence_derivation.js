'use strict';
/**
 * Consistency model B coordinator — PING event authority convergence, Phases 8/9 (2026-09-19).
 *
 * RECORDED DECISION (Phase 8/9): consistency model = B, durable derived representation.
 *
 *   1. The authoritative commit happens EXACTLY ONCE: UnifiedEventRuntime.emit()
 *      persists the canonical event in ping_events. That is the single
 *      authoritative runtime commit.
 *   2. The canonical_events representation is DERIVED immediately and
 *      synchronously after the commit within the same request path
 *      (deriveRepresentationAfterCommit). It is not a second commit: it never
 *      re-emits, never mints identity, never dispatches missions.
 *   3. Derivation is idempotent on retry with the same identity: retrying with
 *      the same canonical event (same source_event_id) resolves to the same
 *      envelope row — no duplicate row, no duplicate downstream dispatch.
 *   4. The representation is rebuildable from ping_events history at any time
 *      (rebuildMissingRepresentations). No naive dual write: the two stores are
 *      never written as independent truths in one step.
 *
 * FAILURE SEMANTICS (model B):
 *   - Source commits, derivation may fail. A failed derivation leaves the
 *     authoritative commit intact in ping_events; the caller retries
 *     derivation with the SAME event object (same identity). The retry is
 *     idempotent: same source_event_id -> same envelope row, ON CONFLICT
 *     absorbs the duplicate, the downstream hook does not refire.
 *   - Duplicate derivation is harmless by construction (unique partial index
 *     on canonical_events.source_event_id; content-hash conflict check).
 *   - Conflicting content under the same identity fails closed
 *     (CONVERGENCE_IDENTITY_CONFLICT): the certified representation is
 *     immutable and is never overwritten or re-derived.
 *   - Anything not derived (missed derivations, pre-convergence history) is
 *     recoverable via rebuildMissingRepresentations, which is itself
 *     idempotent and safe to run repeatedly.
 */

/**
 * Derive the canonical_events representation immediately after the
 * authoritative commit, in the same request path.
 *
 * Precondition: emitResult is a successful UnifiedEventRuntime.emit() result
 * (status 'ok'). This function performs NO emit of its own — calling it
 * without a prior commit fails closed (NO_AUTHORITATIVE_COMMIT) rather than
 * manufacturing a commit.
 *
 * @param {object} args
 * @param {object} args.envelope — CanonicalEventEnvelope (acceptCanonicalEvent)
 * @param {object} args.emitResult — UER emit result ({ status:'ok', event })
 * @param {function} [args.onDerived] — downstream projection hook; fires only
 *   when the representation row is actually inserted, never on idempotent
 *   retries or conflicts.
 * @returns {Promise<object>} acceptCanonicalEvent result
 */
async function deriveRepresentationAfterCommit(args) {
  const opts = args || {};
  if (!opts.envelope || typeof opts.envelope.acceptCanonicalEvent !== 'function') {
    throw new Error('deriveRepresentationAfterCommit: envelope with acceptCanonicalEvent() is required');
  }
  const emitResult = opts.emitResult;
  if (!emitResult || emitResult.status !== 'ok' || !emitResult.event || !emitResult.event.event_id) {
    return {
      status: 'error',
      code: 'NO_AUTHORITATIVE_COMMIT',
      error: 'derivation requires a successful authoritative commit ' +
        '(UnifiedEventRuntime.emit() with status "ok"); refusing to derive ' +
        'a representation without one — no commit is manufactured here',
    };
  }
  // The commit already happened exactly once in ping_events. Derive only.
  return opts.envelope.acceptCanonicalEvent(emitResult.event, { onDerived: opts.onDerived });
}

/**
 * Rebuild representations missing from canonical_events by scanning the
 * authoritative ping_events history. Idempotent: safe to run repeatedly;
 * rows already represented (via derivation or via legacy-ingress convergence)
 * are skipped, never duplicated.
 *
 * @param {object} args
 * @param {object} args.pool — pg.Pool
 * @param {object} args.envelope — CanonicalEventEnvelope
 * @param {number} [args.batchSize=200]
 * @returns {Promise<{status:string,rebuilt:number,alreadyRepresented:number}>}
 */
async function rebuildMissingRepresentations(args) {
  const opts = args || {};
  if (!opts.pool) throw new Error('rebuildMissingRepresentations: pool is required');
  if (!opts.envelope || typeof opts.envelope.acceptCanonicalEvent !== 'function') {
    throw new Error('rebuildMissingRepresentations: envelope with acceptCanonicalEvent() is required');
  }
  const batchSize = Math.min(Math.max(parseInt(opts.batchSize, 10) || 200, 1), 5000);
  let rebuilt = 0;
  let alreadyRepresented = 0;
  for (;;) {
    const res = await opts.pool.query(
      'SELECT p.event_id, p.event_type, p.source, p.timestamp, p.payload, p.metadata, p.namespace, p.sequence ' +
      'FROM ping_events p ' +
      'LEFT JOIN canonical_events c ON c.source_event_id = p.event_id ' +
      // A legacy-ingress row converged by the adapter is already a preserved
      // representation of this canonical event (metadata cross-reference).
      'WHERE c.event_id IS NULL ' +
      'AND NOT EXISTS (SELECT 1 FROM canonical_events l ' +
      "WHERE l.metadata->'legacy_ingress'->>'canonical_event_id' = p.event_id) " +
      'ORDER BY p.sequence ASC NULLS LAST LIMIT $1',
      [batchSize]
    );
    if (res.rows.length === 0) break;
    for (const row of res.rows) {
      const event = {
        event_id: row.event_id,
        event_type: row.event_type,
        source: row.source,
        namespace: row.namespace,
        timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
        payload: row.payload,
        metadata: row.metadata || {},
        sequence: row.sequence != null ? Number(row.sequence) : null,
      };
      const derived = await opts.envelope.acceptCanonicalEvent(event);
      if (derived.status === 'ok' && derived.inserted) {
        rebuilt++;
      } else if (derived.status === 'ok') {
        alreadyRepresented++;
      } else if (derived.code === 'CONVERGENCE_IDENTITY_CONFLICT') {
        // Content drifted under a stable identity since the commit; the
        // certified representation is immutable, so this is counted, never
        // overwritten. Operator attention, not silent repair.
        alreadyRepresented++;
      } else {
        throw new Error('rebuildMissingRepresentations failed on ' + row.event_id +
          ': ' + derived.code + ': ' + derived.error);
      }
    }
  }
  return { status: 'ok', rebuilt: rebuilt, alreadyRepresented: alreadyRepresented };
}

/**
 * Audit the explicit cross-references (Phase 5).
 *
 * @param {object} args
 * @param {object} args.pool — pg.Pool
 * @returns {Promise<object>} { status, danglingRepresentations, unrepresentedCanonicalEvents }
 *   danglingRepresentations: representation rows whose source_event_id has no
 *     ping_events row (must be empty in a healthy converged store).
 *   unrepresentedCanonicalEvents: count of ping_events rows with no
 *     representation row yet (rebuildable; not an error by itself).
 */
async function auditCrossReferences(args) {
  const opts = args || {};
  if (!opts.pool) throw new Error('auditCrossReferences: pool is required');
  const dangling = await opts.pool.query(
    'SELECT c.event_id, c.envelope_id, c.source_event_id ' +
    'FROM canonical_events c LEFT JOIN ping_events p ON p.event_id = c.source_event_id ' +
    'WHERE c.source_event_id IS NOT NULL AND p.event_id IS NULL'
  );
  const unrepresented = await opts.pool.query(
    'SELECT COUNT(*)::int AS n FROM ping_events p ' +
    'LEFT JOIN canonical_events c ON c.source_event_id = p.event_id ' +
    'WHERE c.event_id IS NULL ' +
    "AND NOT EXISTS (SELECT 1 FROM canonical_events l WHERE l.metadata->'legacy_ingress'->>'canonical_event_id' = p.event_id)"
  );
  return {
    status: 'ok',
    danglingRepresentations: dangling.rows,
    unrepresentedCanonicalEvents: unrepresented.rows[0].n,
  };
}

module.exports = {
  deriveRepresentationAfterCommit: deriveRepresentationAfterCommit,
  rebuildMissingRepresentations: rebuildMissingRepresentations,
  auditCrossReferences: auditCrossReferences,
};
