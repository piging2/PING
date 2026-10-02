# COLLISION NOTE: OBJECT shard-2 (missions 1000-1499)

## What happened

Two workers ran OBJECT shard-2 concurrently on 2026-09-23/24:

- **OBJECT-SHARD-1 (first)**: ran missions 1000-1499 with the shard-1 harness
  (deterministic: fixture rotation by group, mutation seed = mission index),
  ~03:15-03:33 UTC. Wrote results.jsonl + SUMMARY.md into
  missions/object/shard-2/. Outcome: 493 GENERATED, 7 NEEDS_REVIEW
  (OBJECT-UNBOUND-RAIL-LEAK, the ObjectRail raw-title/description class).
- **WORLD-SHARD-2 (second, me)**: after finishing WORLD missions 1000-1499 and
  finding all WORLD shards occupied, I checked missions/object/ for shard-0
  and shard-1 only, never verified shard-2 was unclaimed, and started work
  there at ~03:30 UTC with a different harness (corpus fixture rotation +
  different mutations). At 03:47:54 UTC my results download OVERWROTE their
  results.jsonl with my 500 rows.

## Recovery

Their raw results.jsonl was not recoverable from disk (overwritten) and their
transfer-dir copies had been cleaned up per their hygiene practice. However,
their harness is fully deterministic (seed = mission index, pinned
generatedAt, digest-checked determinism), their Pig scratch
(/home/nolan/fyd-factory/object-shard1/) was left in place with fixtures,
harness, and shims, and their SHARD-LOG explicitly anticipates reproduction
("if the other worker reruns those shards with the same mission design
(seed = index), outcomes should agree").

I re-ran their exact harness (their file, their fixtures, their shims,
FYD_START=1000 FYD_END=1499) and verified the reproduction against their
SUMMARY.md before restoring:

- Reproduction: 493 GENERATED / 7 NEEDS_REVIEW, missions 1000-1499 complete,
  0 crashes.
- All 7 NEEDS_REVIEW are unbound_claim_in_output: 4 on trades-a
  (batch-a-electrician.json), 3 on hostile (nojsonld-retail, nojsonld-prof,
  rtl-food). Matches their SUMMARY.md exactly.

`results.jsonl` in this directory is that verified reproduction; their
`SUMMARY.md` is untouched as the canonical summary.

## Disposition of my duplicate run

My run used a different harness and found different, independently real
classes (phone-conflict dial-action fail-closed violation, 44 missions;
claim-badge gap corroboration, 1206 unbound sections). It is preserved as
comparison/falsification data, following the world/shard-4 precedent
(COLLISION-NOTE-WORLD-SHARD-1.md):

- results-collision-w1.jsonl: my canonical 500 rows
  (456 GENERATED_WITH_WARNINGS, 44 NEEDS_REVIEW)
- results-collision-w1-patched.jsonl: my patched rerun (500
  GENERATED_WITH_WARNINGS; exactly the 44 phonec-class missions fixed)
- SUMMARY-COLLISION-W1.md: my summary
- SHARD-LOG-COLLISION-W1.md: my work log
- missions/patches/0002-object2-phonec-dial-gating.patch: my proposed patch
- missions/fixtures/object2-phonec-dial-gap.json: my fixture

I am moving my mainline work to object/shard-4 (missions 2000-2499), which
their log lists as unclaimed (shards 4, 5, 6 remain).

## Systemic gap (echoing the world/shard-4 note)

The protocol has no claim/lock mechanism: "check the directory listing, then
take it" races when two workers check minutes apart. Worse, I checked
incompletely (listed shard-0/shard-1, assumed shard-2 free). Suggested:
a CLAIMS.jsonl at missions/<class>/ that a worker appends atomically BEFORE
running. I did not create one unilaterally; the parent should decide the
convention.
