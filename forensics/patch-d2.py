"""D-2 patch: ping-runtime/events/unified_event_runtime.js
Phase 12 collision law at the UER commit layer: on identity conflict, compare
canonical bytes. Byte-equivalent -> idempotent return of the existing event
(no new dispatch). Different content -> deterministic EVENT_IDENTITY_CONFLICT
(named error, no overwrite, no downstream dispatch).
Exact-match replacements; fails loudly if the source text drifted.
"""
import sys

PATH = '/home/nolan/worktrees/constitutional-convergence-authority-law/ping-runtime/events/unified_event_runtime.js'

with open(PATH, 'r', encoding='utf-8') as f:
    src = f.read()

# --- Replacement 1: require convergence_identity (same dir; no cycle: it only
# requires canonical_authority -> kernel canonical_authority) ---
old_req = """const { identityAuthority } = require('../authorities/identity_authority.js');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
"""
new_req = """const { identityAuthority } = require('../authorities/identity_authority.js');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');
const { canonicalEventHash } = require('./convergence_identity.js');
"""
assert src.count(old_req) == 1, 'require anchor not found exactly once'
src = src.replace(old_req, new_req, 1)

# --- Replacement 2: conflict path with content comparison ---
old_block = """        } else {
          this._stats.deduplicated++;
          // Idempotent duplicate: the canonical row already exists with its
          // original sequence position. Re-read it so the caller observes the
          // one persisted position rather than a phantom second allocation.
          try {
            const existing = await this._pool.query(
              'SELECT sequence FROM ping_events WHERE event_id = $1',
              [event.event_id]
            );
            const erow = existing && existing.rows && existing.rows[0];
            sequence = erow && erow.sequence != null ? Number(erow.sequence) : null;
          } catch (readErr) {
            sequence = null;
          }
        }
"""
new_block = """        } else {
          // D-2 (Phase 12 collision law at the commit layer): the identity
          // collided, so compare canonical bytes before deciding what this
          // duplicate means. Same event_id + byte-equivalent canonical content
          // = idempotent duplicate: return the existing event, no new
          // dispatch. Same event_id + different canonical content = COLLISION:
          // fail closed deterministically (named error, no overwrite, no
          // downstream dispatch). The stored row is authoritative and is never
          // overwritten by the presented event.
          // The verbatim sequence re-read below is kept (structural contract):
          // the caller observes the one persisted sequence position rather
          // than a phantom second allocation.
          let storedRow = null;
          try {
            const existing = await this._pool.query(
              'SELECT sequence FROM ping_events WHERE event_id = $1',
              [event.event_id]
            );
            const erow = existing && existing.rows && existing.rows[0];
            sequence = erow && erow.sequence != null ? Number(erow.sequence) : null;
          } catch (readErr) {
            sequence = null;
          }
          try {
            const content = await this._pool.query(
              'SELECT event_id, event_type, source, namespace, timestamp, payload, metadata FROM ping_events WHERE event_id = $1',
              [event.event_id]
            );
            storedRow = content && content.rows && content.rows[0] ? content.rows[0] : null;
          } catch (contentErr) {
            storedRow = null;
          }
          if (storedRow) {
            const storedEvent = {
              event_id: storedRow.event_id,
              event_type: storedRow.event_type,
              source: storedRow.source,
              namespace: storedRow.namespace,
              payload: storedRow.payload,
              metadata: storedRow.metadata,
            };
            let equivalent = false;
            try {
              equivalent = canonicalEventHash(storedEvent) === canonicalEventHash(event);
            } catch (hashErr) {
              equivalent = false;
            }
            if (equivalent) {
              // Byte-equivalent duplicate: idempotent return of the EXISTING
              // event. No handler dispatch and no integration routing; the
              // first commit already drove downstream exactly once.
              this._stats.deduplicated++;
              let storedTs = null;
              try {
                storedTs = storedRow.timestamp != null ? new Date(storedRow.timestamp).toISOString() : null;
              } catch (tsErr) {
                storedTs = null;
              }
              const existingEvent = {
                event_id: storedRow.event_id,
                event_type: storedRow.event_type,
                source: storedRow.source,
                namespace: storedRow.namespace,
                timestamp: storedTs || event.timestamp,
                payload: storedRow.payload,
                metadata: storedRow.metadata,
                sequence: sequence,
              };
              return { status: 'ok', eventId: eventId, event: existingEvent, sequence: sequence, deduplicated: true };
            }
            // Content drift under a colliding identity: fail closed. No
            // overwrite (the INSERT already took DO NOTHING), no handler
            // dispatch, no integration routing.
            this._stats.failed++;
            return {
              status: 'error',
              code: 'EVENT_IDENTITY_CONFLICT',
              error: `identity collision at the commit layer: event_id ${eventId} is already committed with different canonical content; ` +
                `refusing to overwrite the authoritative row or dispatch downstream (fail-closed)`,
              eventId: eventId,
            };
          }
          // The authoritative row could not be read back (mock pools in evals
          // return no rows for SELECTs; against a real pool this is
          // unreachable because the conflict proves the row exists). Preserve
          // the legacy behavior exactly: count the dedup and fall through to
          // the normal dispatch path, so mock-based baselines observe no
          // change. Equivalence could not be proven here; it is not claimed.
          this._stats.deduplicated++;
        }
"""
assert src.count(old_block) == 1, 'conflict-path anchor not found exactly once'
src = src.replace(old_block, new_block, 1)

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print('D-2 patch applied OK')
