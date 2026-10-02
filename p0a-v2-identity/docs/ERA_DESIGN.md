# ERA DESIGN — V1 READER / V2 WRITER / ERA SEPARATOR
2026-10-01. Adopts WS2 §4.3/§4.4 with the deviations in WS2_RECONCILIATION.md.

## The separator

Event IDs carry their era IN THE STRING: `ev2:<domain>:<64hex>`
(e.g. `ev2:spine:9f2c…`). `:` appears in NO V1 scheme (64-hex, `evt_*`,
`fyd-*`, `mc-*`), so era parsing is unambiguous and greppable. The era
AND domain are ALSO inside the hashed preimage (domain separation in the
bytes, not just the label):

    preimage = JCS({"era":"v2","domain":<domain>,"eventType":…,"source":…,
                    ["namespace":…],["tenant_id":…],["logical_id"|"payload":…]})
    event_id = "ev2:<domain>:" + hex(sha256(preimage))

Cross-era collision is impossible by construction: a V1 row can never
parse as V2 (no `:`), and a V2 preimage can never equal a V1 preimage
(the `era`/`domain` fields are always present).

## Reader (dual-era, forever)

`eraOf(event_id)` is a pure classifier:
- `ev2:<domain>:` + 64 hex -> v2 (+domain; unregistered domain -> UNKNOWN)
- 64-char lowercase hex -> v1-spine
- `evt_<16hex>` -> v1-evt
- `fyd-seed-ovl-NNN`, `fyd-ovl-<base36>-<12hex>`, `mc-bf-<12hex>`,
  `mc-apr-<16hex>`, `mc-d-<12hex>` -> v1-journal
- anything else -> UNKNOWN (throw; never guess)

`contractOf(row)` prefers the row's `metadata.identity_era` marker when
present, but FAILS CLOSED if the marker disagrees with the ID's era or
is itself unparseable. Absent marker -> `eraOf`. This is the brief's S4
rule: if the system cannot determine the contract, STOP.

## Writer (flag-gated, V2 only after authorization)

The V2 minter (`mintV2`) stamps `metadata.identity_era = 'v2'` on new
rows. Minting is behind the per-domain flag (default OFF; see
WIRING_DECISION.md). The V1 minter (`mintV1`) is FROZEN — byte-identical
to `generateSpineEventId` @20528ee18, golden-verified (P-21) — and is used
only for reading/verifying pre-migration rows. No code path remints V1
rows into V2.

## Migration triggers (ALL required, in order)

- T1. P0-A lane closes: lossy boundary fixed, locked regression suite
  green, persisted replay proven before/after. (This lane's deliverable.)
- T2. Nolan's explicit promotion word. Cutover is his call, always.
- T3. Per-domain flag `identity_era_v2` flipped for the domain(s) in
  scope. Default OFF. Spine and journal cut over independently; V1 and V2
  coexist; minters and verifiers are dual-era.

## Rollback (reversible before the verification window closes)

Promotion = flag flip + a bounded verification window (one full
event-plane replay + MC projection rebuild showing identical semantic
state). Before the window closes, rollback = set the flag OFF. New
writes mint V1 again. NO data surgery, NO remint, NO backfill — the flag
is read at mint time only. V2 rows written during the window REMAIN valid
and addressable forever (verifiers are dual-era permanently); rollback
never deletes or rewrites them. After the window closes without rollback,
the V2 rows are permanent history.

Reversibility proof artifact:
`SELECT identity_era, count(*) FROM ping_events GROUP BY 1` before/after —
the only V2 rows are those minted while the flag was ON; V1 rows are
byte-identical.

## Schema change (migration-time, proven safe)

`ALTER TABLE ping_events ALTER COLUMN event_id TYPE VARCHAR(128)` +
`ADD COLUMN identity_era VARCHAR(8) NOT NULL DEFAULT 'v1'`. Widening is
value-preserving and reversible while no V2 rows exist — proven on
scratch PG (R3: 3 rows in at VARCHAR(64), widened, all rows byte-identical).
Journal IDs are unconstrained strings; no DDL needed there.

## Bridge cursor note (migration-time verification item)

`EventBridge` orders by `event_id` as a string and cursors on
`last_event_id`. V1 IDs are content hashes (no time order); V2 IDs are
too. `ev2:`-prefixed IDs interleave lexicographically with V1 hex IDs.
Cursor semantics must be re-proven against a mixed-era table at
migration time, or the cursor moved to (created_at, event_id). Not
tonight's work; flagged.
