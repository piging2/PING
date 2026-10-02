# LANE B — Collision safety deep zoom

Worktree `/home/nolan/worktrees/constitutional-convergence-authority-law`, HEAD `0d3cddd4a`.
D-2 branch worktree `/home/nolan/worktrees/ping-event-runtime`, branch `event-runtime-deduplication`.

## 1. Current law — event ID derivation (CONFIRMED)

V2 format `event_<16hex>` **CONFIRMED**, 64 bits retained:

- `runtime/kernel/authorities/identity_authority.js` — `generateFromCanonicalHash(canonicalBytes, type)`
  returns `` `${type}_${hash.substring(0, 16)}` ``. For events, `type='event'` → `event_<16 hex chars>`.
- `runtime/kernel/authorities/canonical_authority.js:185-189` — `hashBytes(bytes, algorithm='sha256')`
  = `crypto.createHash('sha256').update(bytes).digest('hex')`: full digest 64 hex chars / 256 bits.
  **16 of 64 hex chars are retained; 192 bits are truncated and discarded.**
- Preimage (what is hashed), from `generateId` + UER step 1/4
  (`unified_event_runtime.js:128-133, :198-214`):
  `{ type:'event', version:'2.0.0', identity_version:'2.0.0', event_type, source, namespace,
     logical_id | payload }` canonically serialized (RFC-8785) then SHA-256.
  **Excluded from identity by design:** `timestamp` (observation metadata, assigned after identity),
  all of `metadata` (causation_id, correlation_id, confidence...). Two emissions of the same logical
  event hash identically even with different timestamps/metadata — this is the designed idempotent-retry
  property.

## 2. Is the FULL canonical digest persisted anywhere? NO.

- `ping_events` DDL (`unified_event_runtime.js` `initialize()`): columns are `event_id, event_type,
  source, timestamp, payload, metadata, namespace, processed, created_at, sequence`. **No
  `canonical_hash` column, no digest column of any kind.**
- `emit()` never computes or stores the full 256-bit digest. The `event` object built at :219-238
  has no digest field.
- `metadata.canonical_hash` appears only opportunistically: `event_to_mission_bridge.js:127` reads
  `(event.metadata && event.metadata.canonical_hash) || null` — i.e., only if the *caller* supplied
  it via `options.metadata`. The UER never produces it.
- Other `canonical_hash` usages in the tree (`ping-runtime/evidence/*`) concern evidence artifacts /
  Qdrant payloads, not the UER journal.
- Consequence: on an `event_id` conflict there is **no witness** with which to decide
  duplicate-vs-collision. The 192 truncated bits are unrecoverable from the row.

## 3. ON CONFLICT(event_id) behavior — silently deduplicated, content NOT compared

`unified_event_runtime.js:245-246`:
`INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING RETURNING sequence`.
On conflict (rowCount=0): `stats.deduplicated++`, re-`SELECT sequence` (:263), **fall through to
handler dispatch and return `{status:'ok', ...}`** — same shape as a fresh insert, no `deduplicated`
flag. The existing row's content is never read, never compared. A second, materially different event
hashing to the same 64-bit prefix is **silently dropped from the journal while the caller is told
ok** — and, per the fall-through, its handlers still fire (see EMIT-TIMELINE.md B6/T7), so the
journal and downstream effects diverge: journal holds content A, handlers processed content B.

## 4. Birthday math (64-bit IDs, P ≈ 1 − e^(−n(n−1)/2^65))

| events (n) | P(≥1 collision) | ~1 in |
|---|---|---|
| 1e6 | 2.71e-08 | 36,900,000 |
| 1e7 | 2.71e-06 | 369,000 |
| 1e8 | 2.71e-04 | 3,690 |
| 1e9 | 2.67e-02 | 37 |
| 4e9 | 3.52e-01 | 3 |
| 2^32 (4.29e9) | 3.93e-01 | 3 |

50%-collision threshold: n ≈ 5.06e9 events. Random collision is negligible at any plausible PING
volume (thousands–millions of events), but the probability grows quadratically and the failure mode
is silent data loss with a success receipt, so the law must still fail closed.

## 5. Adversarial choosability

- **Second-preimage** (grind material colliding with a *specific existing* `event_id`): 2^64 SHA-256
  work — infeasible. Targeted suppression of someone else's event is not practical.
- **Chosen-pair collision** (find *any two distinct* valid materials with the same 64-bit prefix):
  ≈2^32 hashes (≈4.3B) — **feasible offline** (hours on commodity GPUs). The derivation is fully
  deterministic and the attacker controls almost the entire preimage (`event_type` must validate,
  `source`/`namespace` pass governance, but `payload`/`logical_id` are free). The attacker grinds
  offline, then emits only the two colliding events.
- **Impact under current fail-open law:** the second event's content is dropped from the journal
  (DO NOTHING), caller receives `status:'ok'`, handlers fire for the *dropped* content — a
  journal/handler split-brain manufactured for the price of one GPU job. Practical exploitability
  today is low (requires emit capability and motive), but the defect is structural: no witness, no
  comparison, success receipt on data loss.

## 6. HARVEST — D-2 branch mechanism (exact)

Branch `event-runtime-deduplication` in `/home/nolan/worktrees/ping-event-runtime`
(read-only `git show`; nothing checked out, modified, or executed).

**75827fbd7** `test(event-runtime): document collision detection defect` — test-only. Documents that
`ON CONFLICT DO NOTHING` → rowCount 0 was classified as duplicate regardless of content: "fail-open
defect that silently accepts conflicting content under the same event ID." Required fix stated as:
read persisted row on conflict, compare canonical content, error on collision.

**1f40cf432** `fix(events): implement collision detection for duplicate event IDs` — the mechanism,
exact diff against `ping-runtime/events/unified_event_runtime.js`:
- On rowCount=0: `SELECT payload, metadata, namespace FROM ping_events WHERE event_id = $1`
  (a **separate** `pool.query` — separate implicit transaction, NOT atomic with the INSERT).
- Compares `JSON.stringify(persistedRow.payload)` vs `JSON.stringify(event.payload)`.
  **What it compares:** payload only. Metadata deliberately excluded: "metadata can differ on
  legitimate retries (causation_id, correlation_id, etc.), so only payload collision is treated
  as an error."
- Equal payload → genuine duplicate → `{status:'ok', eventId, event, deduplicated: true}`
  (**early return: no handler re-dispatch**, unlike current main).
- Different payload → fail closed: `stats.failed++`, `{status:'error',
  error:'Collision detected: same event_id with different payload', eventId, collision: true}`.
- Row absent (unreachable against a real DB; mock pools) → legacy dedup ok.
- **Harvested flaws (do not copy verbatim):**
  1. `JSON.stringify` comparison is key-order-sensitive; PostgreSQL `jsonb` normalizes stored key
     order (length-then-lexicographic) while the in-memory object keeps caller insertion order —
     byte-identical semantic content can compare unequal → false collision flags.
  2. TOCTOU: SELECT runs in a different implicit transaction after the INSERT's conflict; not atomic.
  3. No canonical-hash witness persisted — the comparison is recomputed content matching, still
     64-bit-ID-based, and cannot distinguish "same preimage" from "same payload, different
     preimage path" (logical_id vs payload ambiguity).
- Sibling commit on the branch, `23f0df57e fix(events): prevent duplicate handler/integration
  dispatch`, confirms the base behavior the D-2 work reacted to: duplicates re-dispatch handlers.

## 7. The revert — what was enforced, what was removed, what remains

- **ab0adbc20** (2026-09-19 06:48, main worktree): `fix(event-authority): D-2 enforce Phase 12
  collision law at the UER commit layer`. Stronger than the D-2 branch version: on conflict it
  `SELECT`ed the full row and compared `canonicalEventHash(storedEvent) ===
  canonicalEventHash(event)` (`convergence_identity.js:113`: SHA-256 over `normalizeCanonicalEvent`
  = {event_id, event_type, source, namespace, payload, metadata minus envelope}; timestamp and
  sequence excluded). Byte-equivalent → idempotent dedup with early return (no re-dispatch).
  Different → fail closed `{status:'error', code:'EVENT_IDENTITY_CONFLICT', ...}`, no overwrite,
  no dispatch. **Design tension it introduced:** `canonicalEventHash` includes `metadata`, but UER's
  own identity law excludes metadata — a legitimate retry with a new `causation_id` (same logical
  event, same event_id by design) would hash differently and be flagged a collision. The reverted
  enforcement contradicted the retry semantics it was meant to protect.
- **114afad01** (2026-09-19 06:50): clean revert of ab0adbc20 (83 lines: 4 insertions, 79 deletions).
  Verified: `git diff 114afad01 HEAD -- ping-runtime/events/unified_event_runtime.js` is empty.
- **What remains:** zero collision enforcement. `grep` confirms no reference to
  `convergence_identity` or `canonicalEventHash` in `unified_event_runtime.js`. Current law =
  §3: silent dedup, no comparison, ok receipt, handlers re-fire. The fail-open defect documented
  by 75827fbd7 is the live behavior at HEAD.

## 8. SPEC — minimal collision-witness patch (preserves compact historical IDs)

Goal: keep `event_<16hex>` IDs byte-identical for all historical rows (no ID rewrites; 12-leaf P0
invariant), while making duplicate-vs-collision decidable and fail-closed.

**Schema (additive only):**
```sql
ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS canonical_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_ping_events_canonical_hash ON ping_events(canonical_hash);
```
`canonical_hash` = full 64-hex SHA-256 digest of **the exact identity-preimage bytes** — i.e., the
untruncated `CanonicalAuthority.hashBytes(canonicalBytes)` whose first 16 hex chars form the
`event_id`. (IdentityAuthority can return both digest and truncated ID from one computation.)
**Not** `canonicalEventHash()` from `convergence_identity.js`: that hash includes `metadata`,
which identity excludes; the witness must be preimage-equivalent so retries with new
causation_id/correlation_id remain idempotent duplicates. This resolves the D-2-branch
(payload-only) vs reverted-main (metadata-inclusive) disagreement in favor of the identity law.
Historical rows: `canonical_hash = NULL`, **never backfilled by recomputation** — the stored row
does not record whether the preimage used `logical_id` or `payload`, so recomputation is not
provably identical to the original digest; do not fabricate a witness.

**Emit-path transaction semantics (exact):**
```
client = pool.connect(); BEGIN
1. INSERT INTO ping_events
     (event_id, event_type, source, timestamp, payload, metadata, namespace, canonical_hash)
   VALUES ($1..$8)
   ON CONFLICT (event_id) DO NOTHING
   RETURNING sequence
   -- rowCount=1: fresh persist. COMMIT. stats.persisted++. Proceed to dispatch.
2. rowCount=0 (conflict): in the SAME transaction,
   SELECT event_id, event_type, source, namespace, payload, canonical_hash
   FROM ping_events WHERE event_id = $1
   -- the conflict proves the row exists; same-tx read removes the D-2 TOCTOU.
3. candidate_witness = full preimage digest of the presented event (recompute, or carry from step 4)
   a. stored.canonical_hash IS NULL (legacy row): equivalence UNPROVABLE.
      → legacy dedup: stats.deduplicated++, COMMIT, dispatch per current at-least-once law,
        return {status:'ok', eventId, event, sequence, deduplicated:true, witness_unavailable:true}.
        No equivalence claim is made.
   b. candidate_witness == stored.canonical_hash: genuine idempotent duplicate (same logical event,
      possibly retried with different timestamp/metadata — all excluded from the preimage by design).
      → stats.deduplicated++, COMMIT, return {status:'ok', ..., deduplicated:true}.
        Dispatch-on-dedup is an OPERATOR DECISION (current main re-dispatches = at-least-once;
        both D-2 variants returned early = no re-dispatch); record the chosen law explicitly.
   c. otherwise: TRUE COLLISION (same 64-bit ID, different identity preimage).
      → FAIL CLOSED: stats.failed++, COMMIT (nothing was written; DO NOTHING already held the
        stored row — no ROLLBACK needed, and the stored row is NEVER overwritten),
        return {status:'error', code:'EVENT_IDENTITY_CONFLICT', eventId, collision:true,
                error:'identity collision: event_id <id> is committed with a different canonical
                       preimage; refusing to overwrite or dispatch'}.
        NO handler dispatch. NO integration routing. The authoritative row is untouched.
   On any SQL throw: ROLLBACK, stats.failed++, {status:'error', ...} as today.
finally: client.release()
```
**Why this is minimal:** one nullable column, one digest already computed at mint time (truncate
after persisting the full value), one explicit transaction around the two statements that are
already adjacent, comparison against the preimage the ID was actually derived from. No ID format
change, no historical rewrite, no new tables, no new services. The NULL-witness legacy path
preserves current behavior exactly where equivalence cannot be proven, and says so in the return
value instead of silently claiming a duplicate.
