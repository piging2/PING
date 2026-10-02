# WIRING DECISION — P0-A OVERNIGHT LANE
2026-10-01 ~20:35 MDT.

## Decision: DO NOT WIRE TONIGHT. STOP. Report blocked-with-evidence.

The replacement is proven at the harness level (31/31 proofs, 90k-iteration
fuzz, cross-runtime byte-identical, 8/8 persisted-replay on scratch PG),
but wiring = changing the production mint/conflict path, which is a
production behavior change. Per the binding directive, wiring requires
every proof green AND wiring safety/reversibility proven. The second
condition is not fully met tonight. The exact blockers:

## Blockers (each independently sufficient to STOP)

1. **Config authority owner has not placed the V2 flag.** Open item (c):
   flag naming/placement (env var vs config authority) needs the config
   authority owner's call. Without the flag's home, there is no reversible
   promotion mechanism — and reversibility is the precondition.
2. **Conflict-semantics fix must land before any V2 minting (WS2-(d)).**
   The protocol is implemented and proven, but on the DEPLOYED line the
   live conflict check is the top-level whitelist (LOCK-15): wiring the V2
   minter while the deployed comparator stays blind would leave the
   nested-difference silent-dedup open under logical_id. The comparator
   swap is a production code change needing the morning's eyes.
3. **Bridge cursor re-verification.** `ev2:` IDs interleave
   lexicographically with V1 hex IDs; cursor/`ORDER BY event_id` semantics
   must be re-proven against a mixed-era table (ERA_DESIGN.md). Not done.
4. **`evt_*` family disposition.** Recommendation recorded (carry
   recognition, deprecate minting); final RETIRE is Nolan's call (b).
5. **`.ws3_audit.js` reference unresolved.** The file is absent
   (WS3_AUDIT_INVENTORY.md); the morning should resolve whether it was
   deleted or mispathed before any production change.

## What IS ready for the morning

- Frozen V1 reader, V2 writer, era separator, conflict protocol — all
  proven, committed (56cba6f), never pushed.
- Locked regression suite: 5 RED locks pin the V1 defects; 4
  characterization locks pin the deployed-line semantics.
- Migration order: (1) wire the conflict protocol behind the existing
  emit path (both lines' comparators replaced by era-dispatched deep
  compare); (2) DDL widen + identity_era column; (3) T2 Nolan's word;
  (4) flip the per-domain flag; (5) bounded verification window, then
  close or roll back (flag OFF, zero data surgery).

## Reversibility statement

Nothing tonight changed production: no pushes, no DDL, no flag, no
minter swap, no comparator swap. The scratch PG container
(`p0a-scratch-pg`) is disposable; the 3611 production rows were never
touched (read-only forensics only, and none performed by this lane).
Rollback of tonight's work = delete the scratch container; the harness
commits are local-only.
