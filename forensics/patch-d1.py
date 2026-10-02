"""D-1 patch: gateway/canonical_event_envelope.js
Absorb the legacy UNIQUE (tenant_id, sequence) 23505 on the derivation INSERT
into the deterministic equivalence path; bound the conflict retry.
Exact-match replacements; fails loudly if the source text drifted.
"""
import sys

PATH = '/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/canonical_event_envelope.js'

with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Replacement 1: doc comment for step 4 ---
old_doc = """   *   4. Inserts the derived row (ON CONFLICT (event_id) DO NOTHING guards
   *      races) and fires options.onDerived ONLY on actual insert.
"""
new_doc = """   *   4. Inserts the derived row (ON CONFLICT (event_id) DO NOTHING, plus
   *      absorption of a legacy (tenant_id, sequence) 23505 into the same
   *      deterministic equivalence path, guards races) and fires
   *      options.onDerived ONLY on actual insert.
"""
assert src.count(old_doc) == 1, 'doc comment anchor not found exactly once'
src = src.replace(old_doc, new_doc, 1)

# --- Replacement 2: INSERT + conflict path ---
old_block = """    const inserted = await this._storage.query(
      `INSERT INTO canonical_events
         (event_id, envelope_id, source_event_id, event_type, event_version, tenant_id,
          timestamp, sequence, source, actor, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        canonicalId,
        envelopeId,
        canonicalId,
        event.event_type,
        (event.metadata && event.metadata.schema_version) || '1.0.0',
        String(event.namespace),
        event.timestamp,
        event.sequence != null ? event.sequence : null,
        event.source,
        (event.metadata && event.metadata.actor) || 'unspecified',
        JSON.stringify(event.payload),
        JSON.stringify(metadata),
      ]
    );
    if (inserted.rowCount === 0) {
      // Lost a race with a concurrent derivation of the same identity: the
      // row now exists; resolve deterministically through the same path.
      // Terminates: the second pass finds the row via the cross-reference.
      return this.acceptCanonicalEvent(event, options);
    }
"""
new_block = """    // D-1 (Phase 12): canonical_events carries TWO unique keys, PRIMARY KEY
    // (event_id) and the legacy UNIQUE (tenant_id, sequence) receipt-ordering
    // key. This INSERT arbitrates only (event_id), so under a same-event
    // derivation race a loser can block on the winner's speculative
    // (tenant_id, sequence) tuple and PostgreSQL raises 23505 for the
    // non-arbiter index instead of taking the DO NOTHING path. That is a
    // spurious loud error on an idempotent duplicate delivery, never
    // duplication: absorb it and route it into the same deterministic
    // equivalence path as the DO NOTHING race loss (step 2 re-checks by
    // source_event_id plus content hash). Any other error still throws. The
    // legacy key is preserved, not removed: the receipt path
    // (executeEmitEvent) keeps its own (tenant_id, sequence) arbiter.
    let inserted;
    try {
      inserted = await this._storage.query(
        `INSERT INTO canonical_events
           (event_id, envelope_id, source_event_id, event_type, event_version, tenant_id,
            timestamp, sequence, source, actor, payload, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [
          canonicalId,
          envelopeId,
          canonicalId,
          event.event_type,
          (event.metadata && event.metadata.schema_version) || '1.0.0',
          String(event.namespace),
          event.timestamp,
          event.sequence != null ? event.sequence : null,
          event.source,
          (event.metadata && event.metadata.actor) || 'unspecified',
          JSON.stringify(event.payload),
          JSON.stringify(metadata),
        ]
      );
    } catch (err) {
      if (err && err.code === '23505') {
        inserted = { rowCount: 0, rows: [] };
      } else {
        throw err;
      }
    }
    if (inserted.rowCount === 0) {
      // Lost a race with a concurrent derivation of the same identity, or
      // collided on the legacy (tenant_id, sequence) key whose 23505 was
      // absorbed above: the row now exists; resolve deterministically through
      // the same path. Bounded: the retry carries _conflictRetry, so a second
      // consecutive conflict fails closed instead of recursing. Terminates:
      // the retry finds the row via the cross-reference and the step-2
      // equivalence check decides (byte-equivalent -> idempotent; different
      // content -> CONVERGENCE_IDENTITY_CONFLICT).
      if (options && options._conflictRetry) {
        return {
          status: 'error',
          code: 'CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED',
          error: `derivation conflict for canonical identity ${canonicalId} did not resolve on retry; ` +
            `refusing to recurse (fail-closed: no overwrite, no dispatch)`,
        };
      }
      const retryOptions = Object.assign({}, options, { _conflictRetry: true });
      return this.acceptCanonicalEvent(event, retryOptions);
    }
"""
assert src.count(old_block) == 1, 'INSERT block anchor not found exactly once'
src = src.replace(old_block, new_block, 1)

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print('D-1 patch applied OK')
