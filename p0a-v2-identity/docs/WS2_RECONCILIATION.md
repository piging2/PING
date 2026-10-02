# WS2 EXPOSURE REPORT — FOLD-IN RECONCILIATION
2026-10-01 ~20:15 MDT. Source: ~/workspace/ws2/WS2-SERIALIZER-EXPOSURE-REPORT.md
(ingested in full; exposure proofs NOT re-run — adopted as evidence).

## New facts folded in (all change the fix surface)

1. DEPLOYED conflict check is a top-level-key whitelist
   (`JSON.stringify(o, Object.keys(o).sort())`) — blind to ANY nested
   difference. LOCK-15 pins it. The conflict protocol covers it as a
   frozen historical comparator; the forward fix must NEVER use it.
2. Deployed `BaseWorker._emit` defaults `logical_id` to
   `${eventType}:${causation_id}`, removing payload from identity material.
   LOCK-16 pins it. Under logical_id the (blind) conflict check is the
   only guard — this is why (d) says conflict semantics precede V2 minting.
3. Integrated (AUTH-CONV-06) line is WORSE: emit() conflict check uses
   CanonicalBytes, so `[1,2]` is silent-dedup even at top level under
   logical_id. The protocol's `line` parameter pins both historical
   comparators separately.
4. Pipe-delimiter injection in `emit.py mint_event_id` and
   `mc-dispatch.ts mintEventId` (`'|'.join` with no escaping). LOCK-17
   pins the class. Separate defect from the serializer boundary; fixed by
   construction at journal V2 cutover (JCS has no delimiter injection).
   Flagged, not fixed tonight (journal plane; FYD lane).
5. Single admission point VERIFIED (one UnifiedEventRuntime; POST /events
   both paths, all workers, bridge re-minting). Wiring surface = one
   function — but wiring is STOPped tonight (see WIRING_DECISION.md).
6. 6 persisted eras inventoried (see HISTORICAL_COMPAT.md).
7. Bridge cursor (`last_event_id` string-ordered, `ORDER BY event_id ASC`):
   V2 IDs are content-derived like V1 (no time ordering either way).
   `ev2:`-prefixed IDs sort lexicographically AFTER `e`-starting hex and
   interleave with `f`-starting hex — the cursor was already approximate
   on content hashes. Migration-time verification item: cursor semantics
   must be re-proven against a mixed-era table, or moved to
   (timestamp, event_id). NOT tonight's work.
8. FYD `dev-signer.canonicalizeJson` (sorted keys, comma-separated arrays):
   no [1,2] class, NaN->null class present. FYD lane; noted, not in scope.

## V2 design: ADOPTED from WS2 §4 (deviations explicit)

| WS2 §4 item | Disposition |
|---|---|
| Canonical domain (finite JSON; reject NaN/Inf/BigInt/Date/Buffer/undefined) | ADOPTED (matches DOMAIN.md) |
| RFC 8785 via vendored `canonicalize@2.1.0` | ADOPTED (VENDOR.md; replaced my earlier evaluation) |
| Era marker `ev2:<domain>:<64hex>`; era+domain in hashed preimage | ADOPTED (event-identity.cjs) |
| DDL `event_id` VARCHAR(64)->VARCHAR(128) + `identity_era` default 'v1' | ADOPTED as migration plan; widening proven value-preserving on scratch PG (R3) |
| Frozen-V1 verifier; indeterminate era -> STOP/UNKNOWN; never remint | ADOPTED (contractOf, P-21/P-22) |
| Conflict semantics (deep compare under stored row's contract) | ADOPTED + extended to both historical lines (deployed whitelist, integrated CanonicalBytes) |
| Triggers T1 P0-A close -> T2 Nolan's word -> T3 per-domain flag default OFF | ADOPTED (WIRING_DECISION.md) |
| Rollback = flag OFF, zero data surgery | ADOPTED |
| Journal V2 additive; pipe-minters replaced at cutover | ADOPTED as plan, flagged |
| Non-goals (no remint/rewrite/V1 hash change/new authority) | ADOPTED |

## Deviations from WS2 §4.1 (documented, justified)

1. **undefined-valued object keys: REJECT, not drop.** WS2 §4.1 says "dropped
   (JSON semantics, deterministic)". WS2's own §1a proves `{a:1}` vs
   `{a:1,b:undefined}` is a silent-dedup vector on the deployed line. V2 is
   the fix era; carrying the drop forward would carry the defect. The
   validator rejects with DOMAIN_UNDEFINED (P-12). This is the one
   substantive design correction.
2. **Domain registry placement**: domains `spine, journal, witness, replay,
   action` adopted verbatim; `eraOf` enforces registration (unknown domain
   -> UNKNOWN_CONTRACT). The journal domain preimage fields will be
   finalized at journal cutover (FYD lane).

## Open items — closure status

- (a) `canonicalize@2.1.0` LICENSE check: **CLOSED — Apache-2.0** (VENDOR.md).
- (b) `evt_*` family retire-vs-carry: **RECOMMENDED carry-as-recognition,
  deprecate minting.** Zero persisted rows; `eraOf` classifies `evt_*` as
  v1-evt so any stray row verifies; minting path marked deprecated for new
  use. Final RETIRE decision is Nolan's (morning flag).
- (c) V2 flag naming/placement (env vs config authority): **FLAGGED for
  morning** — needs the config authority owner's call (WIRING_DECISION.md).
- (d) Conflict-semantics fix precedes V2 minting: **ACKNOWLEDGED and
  built** — the protocol is implemented and proven; wiring is STOPped
  tonight, so it lands as the first migration step, before any V2 mint.
