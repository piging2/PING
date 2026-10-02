# COLLISION RECONCILIATION: OBJECT shard-0 (missions 0-499)

Reconciled 2026-09-24 ~05:10 MDT by the FYD factory continuation coordinator's
reconciliation worker. This file is the canonical disposition of the OBJECT-0
collision. It does not modify any evidence; it records what happened, what was
verified, and what stands.

## What happened

Two workers ran OBJECT shard-0 (missions 0-499) independently with no
claim/lock mechanism in the protocol:

- **Worker 1 (OBJECT-SHARD-1)**, ran first with their own harness on the Pig.
  Their documented outcome (SUMMARY.md dated 2026-09-23 03:35, full text quoted
  in this directory's SHARD-LOG.md): 493 GENERATED / 7 NEEDS_REVIEW, all 7 the
  known generic class OBJECT-UNBOUND-RAIL-LEAK (failure unbound_claim_in_output,
  all on hostile fixtures), 0 determinism mismatches. Their patch proposal:
  missions/patches/object-rail-binding-gate.patch.
- **Worker 2**, ran second with a different harness (2026-09-23 ~20:37 to
  ~21:50 Pig-local MDT). Their documented outcome: 488 GENERATED / 12
  NEEDS_REVIEW, all 12 the HIDE-OWNER-ZERO-PAGE fail-closed class (validator
  finding "A site needs at least one page."), 0 determinism mismatches,
  0 crashes. Full evidence chain: SHARD-LOG.md, SUMMARY.md, results.jsonl,
  results.500-999.jsonl (supplementary baseline sample, 489/11), 
  results.patched-0-99.jsonl (patched harness rerun), scratch/ with the full
  harness (build-harness.cjs, harness.ts, run-shard.sh, repro scripts).
  Their patch proposals: 0001-rail-bound-description.patch +
  0002-rail-section-bound-summary.patch.

Worker 2 found worker 1's SUMMARY.md in the directory at finalization time,
noted the conflict in SHARD-LOG.md ("Directory conflict note"), and preserved
worker 1's full text there. The results.jsonl currently in the directory is
worker 2's run; worker 1's results were not destroyed (their Pig scratch copy
survives at /home/nolan/fyd-factory/object-shard1/).

The count difference (493/7 vs 488/12) is explained by harness differences, not
mission nondeterminism: worker 1's harness classified unbound rail reads as
NEEDS_REVIEW on the unpatched repo; worker 2's corrected verifier classified
the hide-owner zero-page class as NEEDS_REVIEW and confirmed their detector
catches real unbound-claim leaks (supplementary sample missions 780, 915).

## What was verified (2026-09-24, this worker, read-only checks)

1. results.jsonl in this directory: 500 lines, mission indices exactly 0..499
   contiguous (no gaps, no duplicates), outcomes 488 GENERATED / 12 NEEDS_REVIEW,
   determinism match:true on all 500 (0 mismatches). Matches worker 2's
   documented final run exactly.
2. All 12 NEEDS_REVIEW records: mutation hide-owner, failure_stage validate,
   finding "A site needs at least one page." Matches worker 2's documented
   HIDE-OWNER-ZERO-PAGE class exactly.
3. Pig check (read-only): /home/nolan/fyd-factory/object-shard1/ exists and
   holds worker 1's copy. shard0.jsonl: 500 missions, 493 GENERATED /
   7 NEEDS_REVIEW, matches their SUMMARY.md exactly. Their patch
   (rail-gate.patch) is present there as well. (A separate results.jsonl in the
   same dir shows 492/8, an earlier variant run, superseded by their documented
   shard0.jsonl.)

## Canonical verdict

**Worker 2's run stands as the canonical OBJECT shard-0 record.** The
results.jsonl on disk is byte-consistent with worker 2's documented run on
every checkable axis (distribution, index coverage, determinism, failure
taxonomy), and worker 2's evidence chain is complete (harness, run history,
before/after patch evidence, supplementary samples). This follows the OBJECT-2
precedent: the run whose record matches its documented evidence exactly is the
canonical one. Unlike OBJECT-2, no deterministic re-run was needed here
because no overwrite destroyed worker 2's data; the check was whether the
on-disk data is worker 2's and internally consistent. It is.

## What of worker 1's work is preserved

- Their patch proposal is preserved as missions/patches/object-rail-binding-gate.patch.
- Their independent discovery of the same defect class is recorded as
  corroboration: OBJECT-UNBOUND-RAIL-LEAK (8 missions in shard object-1,
  indices 614, 619, 774, 784, 814, 829, 881, 921). Two independent harnesses
  found the same class; confidence in the defect is higher because of it.
- Their documented run (493/7) survives in full: quoted in this directory's
  SHARD-LOG.md "Directory conflict note", and their raw results live on the
  Pig at /home/nolan/fyd-factory/object-shard1/shard0.jsonl. Nothing of their
  evidence was deleted or overwritten by this reconciliation.

## Patch-reconciliation decision (coordinator's decision, recorded)

Apply TWO patches, skip the third:

- **object-rail-binding-gate.patch** (worker 1): gates the featured object's
  title AND description in ObjectRailSection via the binding verifier
  (boundTitle/boundDescription through resolveBoundField) and restricts
  featured candidates to objects whose title binding verifies. This covers the
  residual worker 2 flagged but did not patch: "rail adapters read o.title raw
  (title binding not gated)" plus the featuring-selection path.
- **0001-rail-bound-description.patch** (worker 2): adds boundRailDescription()
  in object-rail.tsx, routing both adapters (pingObjectToProjection,
  pingObjectToView) through verifyPresentationBinding, covering the client
  hover-preview path. Touches a different file than worker 1's patch; no
  conflict.
- **0002-rail-section-bound-summary.patch** (worker 2): SUPERSEDED. It switched
  ObjectRailSection to render featuredView.summary (the gated value). Once
  worker 1's patch feeds the section's view the verified title/description,
  0002's switch is redundant; it also touches the same renderer.tsx region and
  would overlap. Do not apply.

Open item for the patch-integration lane: confirm the two applied patches do
not fight (worker 1's patch gates the section path, worker 2's 0001 gates the
adapter paths; different files, different surfaces) and that the combined
behavior still renders the bound variant (worker 2's FIXED_OK proof used
0001+0002; re-run the bound-variant check against object-rail-binding-gate +
0001 before integration).
