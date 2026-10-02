# P0-A — Event Identity Era Design: V1 reader + V2 writer

Status: DESIGN ONLY (no production wiring). Needs Nolan's explicit word
before any write-path change. Reversible by design.

## The eras

### V1 — frozen, read forever, never reminted
- **What it is**: every event_id minted before the V2 cutover — 64-hex
  `sha256` strings (from `generateSpineEventId`'s `JSON.stringify`, and from
  `CanonicalBytes`-based hashes).
- **Reader rule**: a V1 id is 64 hex chars with no era prefix, and/or
  `identity_era IS NULL` / `= 'v1'`. V1 rows are NEVER reminted, rewritten,
  or "upgraded". They remain addressable under their historical contract.
- **Replay rule**: V1 events replay under V1 semantics. The V1 comparison
  quirks are historical facts, not bugs to fix retroactively.

### V2 — unambiguous canonical form + explicit era separation
- **Canonical form**: RFC 8785 (JCS) exactly as proven by this harness
  (`jcs-from-spec.js`, 79/79 vectors, oracle agreement, cross-process
  determinism 3/3). Value domain per `DOMAIN.md`; unsupported values throw
  BEFORE hashing.
- **Domain separator** (explicit era/version separation):
  `sha256( "PING/event-id/v2\x00" || jcs_bytes )`.
  The separator guarantees a V2 id can never equal a V1 id even if a V2
  canonical byte string ever coincided with a V1 hash preimage (defense in
  depth; structurally impossible since V1 preimages were `JSON.stringify`
  text, but the separator makes era-confusion a non-issue by construction).
- **ID format**: `"v2:" + hex` (67 chars). Self-identifying in logs,
  projections, and any text surface. Still a plain string for `WHERE
  event_id = $1` lookups — no schema change required for reads.
- **Machine marker**: `identity_era` column (`'v1'`/`'v2'`; NULL reads as
  v1). The column is authoritative; the `"v2:"` prefix is the human/log
  marker. Both, so neither a projection bug nor a log grep can confuse eras.

## Writer design (V2, after cutover word)

```
admit(identity_material):
  1. DOMAIN CHECK — walk the material; any unsupported value
     (non-finite, undefined, BigInt, Date, Buffer, non-plain object,
     lone surrogate, depth > 64) -> THROW (fail closed, no hash minted).
  2. CANONICALIZE — jcs_bytes = JCS(identity_material).
  3. DOMAIN-SEPARATE — digest = sha256("PING/event-id/v2\x00" || jcs_bytes).
  4. MINT — event_id = "v2:" + hex(digest); identity_era = 'v2'.
  5. INSERT ... ON CONFLICT (event_id) DO NOTHING, then conflict verdict
     (see below).
```

The minting function replaces `JSON.stringify` in `generateSpineEventId`
for V2. This also fixes V1's **phantom-duplicate** class: V1's
`JSON.stringify` used key insertion order, so `{a:1,b:2}` and `{b:2,a:1}`
minted DIFFERENT ids for the same semantic event. V2 sorts keys: same
semantic material -> same id, always.

## Conflict semantics (the actual P0 fix)

Current `emit()` on `ON CONFLICT DO NOTHING` no-op compares with
`CanonicalBytes.serializeString` — which is blind to `[1,2]` ≡ `[12]`, so a
genuinely different event can be misclassified as a duplicate and silently
dropped. New rule, era-appropriate comparison:

```
on conflict(event_id):
  existing = SELECT payload, identity_era WHERE event_id = $1
  left  = JCS(JSON.parse(existing.payload))        # V1 rows: parse then JCS
  right = JCS(incoming.payload)                    # V2 rows: already JCS-shaped
  if left == right:  -> IDEMPOTENT_DUPLICATE (count, return ok)
  else:              -> CANONICAL_ID_COLLISION / INTEGRITY FAILURE
                      FAIL CLOSED. Emit diagnostic evidence:
                      event_id, era, sha256(left), sha256(right) —
                      NEVER raw payload bytes (no secret/private leak).
```

Notes:
- JCS is strictly more discriminating than the V1 comparator on every known
  collision class, and agrees with it on true duplicates (both sort keys;
  both treat -0 as 0). The only behavior change is: collisions that V1
  called "duplicate" now fail closed. That is the intended fix.
- This repair is **backward compatible**: it changes only the conflict
  verdict, not minting. True duplicates still dedupe silently; semantic
  collisions now error instead of vanishing.
- Minimal safe step for the night (flagged for morning): this comparator
  swap touches the write path — it needs Nolan's word. Until then, NO
  production change.

## Cutover & reversibility

1. **Compatibility proof first** (this harness): V2 canonicalization proven
   against RFC vectors + PING adversarial vectors + oracle + determinism.
   DONE — see `EVAL-REPORT.md`.
2. **Comparator swap** (needs Nolan's word): conflict verdict uses JCS.
   Reversible: revert the comparator; V1 minting untouched throughout.
3. **V2 writer enable** (needs Nolan's word): feature flag
   `PING_EVENT_ID_ERA=v2` (default unset = V1 minting). New rows get
   `"v2:"` ids + `identity_era='v2'`.
4. **Rollback**: unset the flag -> V1 minting resumes. Mixed-era tables are
   fine: era is explicit per row, readers handle both. Nothing ever needs
   reminting, so there is nothing to "roll back" in history.

## Migration compatibility statement

- **Readers** MUST accept both id shapes: `^[0-9a-f]{64}$` (v1) and
  `^v2:[0-9a-f]{64}$` (v2). Treat `identity_era IS NULL` as v1.
- **Writers**: V1 minting continues until the cutover word; V2 minting only
  under the flag. No writer ever remints another era's ids.
- **Projections/joins**: `event_id` remains the join key; era prefix does not
  break equality lookups. Length grows 64 -> 67 chars; any `CHAR(64)`
  column would need widening — inventory before cutover (flagged).
- **Replay**: historical events verify under their historical contract. If
  the system cannot determine which contract applies to an event: STOP
  (per overnight directive §4) — that is the next broken invariant, and the
  era column/prefix exists precisely so this never happens silently.
- **No history rewrite. No remint. No mass migration.** The V1 corpus is
  immutable; V2 is additive.
