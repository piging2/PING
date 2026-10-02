# OBJECT-SHARD-0 LOG

## Claim

Shard 0, missions 0..499. Work performed 2026-09-23 ~20:37 to ~21:50 Pig-local (MDT).

## Decisions at 80%+ (with evidence)

1. **Category rotation mapping.** The mission requires rotation across `batch-b, trades-a, clearwater, professional, hostile`; the corpus has no `trades-a` directory. Mapped `batch-a/` (4 trade fixtures) to `trades-a` and recorded the mapping in the harness source and SUMMARY.md. Confidence high: `batch-a` is the only trades-named directory and the only plausible equivalent.
2. **Excluded 8 fixtures from rotation.** `conflicting-source, metadata-poor, multi-location, opengraph-heavy, person-heavy, rank-math-graph, service-heavy, simple-jsonld` fit none of the 5 required categories. The protocol says "exactly these categories", so they are excluded and logged, not silently folded into a bucket. Confidence high.
3. **HIDE-OWNER-ZERO-PAGE is fail-closed, no patch.** The validator's typed finding ("A site needs at least one page.") plus NEEDS_REVIEW/validate is the correct handling. Any repo patch that renders in this case would leak hidden owner content. Confidence high.
4. **`unbound-claim-tamper` renders are designed behavior, not counted.** Provenance stays intact, so the graph itself carries the changed value and the badge names a real receipt. Only `unbound-claim` (provenance deleted) counts toward `unbound_claim_count`. Confidence high.
5. **Two patches, not one.** The defect has an observed static-HTML path (`ObjectRailSection` raw read) and latent adapter paths (same raw-read class in `pingObjectToProjection`/`pingObjectToView`). One patch per file keeps blast radius minimal and each independently `git apply --check`able. Confidence high.
6. **Shard-1's overlapping patch left for the lane owner.** OBJECT shard-1 independently found the same defect class and proposed `object-rail-binding-gate.patch`, which additionally gates titles and featuring. The two patches touch overlapping lines in `renderer.tsx`; applying both would conflict. Reconciliation is the lane owner's call, not mine. Confidence high.

## Pig load checks

- Pre-run (20:37): load 2.02-2.32, 24 cores, below the 48 saturation threshold.
- Pre-final-run: load 2.65-2.95. Proceeded.
- No saturation observed at any point.

## Harness build blockers and workarounds

1. `src/fyd/components/registry.ts` imports `./schema-roles`, which does not exist (implementation is at `src/fyd/sitespec/schema-roles.ts`). Plain tsx execution fails at import time. Workaround: esbuild bundle with an `onResolve` redirect applying the code comment's documented intent, plus empty-loader for `.css` imports (plain Node cannot consume `object-circle.module.css`). Repo untouched.
2. Patched test builds redirect `renderer` and `object-rail` imports to scratch copies and rebase their relative imports onto the repo components dir (with extension probing), so the candidate patches are exercised without modifying the repo.
3. `wsl-run.sh` takes a script file, not inline Python; analysis snippets were wrapped in `.sh` files with `python3` heredocs.

## Full-run history

- **Run A (old rotation, old verifier):** 500 missions, 464 GENERATED / 36 NEEDS_REVIEW, 0 crashes, 0 determinism mismatches. 4 `unbound-claim` leaks found by manual sentinel inspection (missions 38, 80, 299, 466); the verifier's badge exemption had hidden them (`unbound_claim_count` stayed 0). 36 NEEDS_REVIEW were the zero-page class.
- **Verifier + rotation corrections** applied to `scratch/harness.ts`.
- **Patched rerun (missions 0-99, candidate patches via esbuild redirect):** 96 GENERATED / 4 NEEDS_REVIEW (all hide-owner fail-closed). 13 `unbound-claim` missions, 0 sentinels rendered. First attempt misclassified 7 `unbound-claim-tamper` missions as NEEDS_REVIEW (dropped mutation scoping); fixed and re-ran.
- **Final run (missions 0-499, baseline repo, `/usr/bin/time -v`):** 2.22 s wall, 225 missions/s, peak RSS 146,132 KB. 488 GENERATED / 12 NEEDS_REVIEW (all hide-owner/validate). 0 crashes, 0 determinism mismatches, 0 unsafe schemes, 0 hidden leaks. 58 `unbound-claim` missions, 0 sentinels rendered (sampling variation; see next).
- **Supplementary baseline sample (missions 500-999):** 489 GENERATED / 11 NEEDS_REVIEW. 2 `unbound-claim` leaks observed (missions 780, 915), both correctly classified NEEDS_REVIEW / verify / unbound_claim_count 1 by the corrected verifier. Confirms the detector works and the final run's zero was sampling.

## Improvement loop (RAIL-UNBOUND-DESCRIPTION)

1. Minimized: `missions/fixtures/rail-unbound-description.json` (service object, description present, provenance deleted; derived from `hostile-rtl-trade`, the fixture where the mission probe fired) plus a bound variant `rail-bound-description.json`.
2. Authority found and reused: `verifyPresentationBinding`/`resolveBoundField` in `src/fyd/sitespec/graph.ts` (client-safe, types-only imports). No new authority created.
3. Patches written to `missions/patches/`, both `git apply --check` clean against the Pig repo working tree (which was clean for these files).
4. Tested: baseline repro renders the sentinel (BUG_PRESENT, exactly 1 occurrence, in `ObjectRailSection`); patched repro omits it; bound variant still renders (FIXED_OK, no over-omit).
5. Falsified: patched harness 0-99 shows 0/13 `unbound-claim` renders; tamper missions unaffected; occurrence counting proves the static-HTML leak is only the section path (adapter gating is proactive for the same class, covering the client hover-preview path).
6. Reran affected missions and recorded before/after evidence (this log, SUMMARY.md, `results.patched-0-99.jsonl`).

## Directory conflict note

At finalization time the shard directory contained a `SUMMARY.md` dated 2026-09-23 03:35, authored by OBJECT-SHARD-1, describing a "continuation shard run" with 493 GENERATED / 7 NEEDS_REVIEW and pointing at that agent's own patch. Those numbers match no run performed by this shard, and the file did not describe the `results.jsonl` in the directory. Its full text was:

```
# OBJECT shard-0 SUMMARY (missions 0-499)

Continuation shard run by OBJECT-SHARD-1 after shard-1 (factory never idles). Same harness, same mutations, unpatched repo (HEAD e48ef710, read-only).

| outcome | count |
|---|---|
| GENERATED | 493 |
| NEEDS_REVIEW | 7 |

- Determinism mismatches: 0. Unsafe URLs in output: 0. Hidden leaks: 0.
- All 7 NEEDS_REVIEW are the known generic class OBJECT-UNBOUND-RAIL-LEAK (failure unbound_claim_in_output), all on hostile fixtures. No new generic classes, no crashes, no validation errors.
- The proposed patch (missions/patches/object-rail-binding-gate.patch) covers these; no new patch needed.
```

It was replaced by this shard's own SUMMARY.md describing the actual shard-0 final run. The shard-1 agent's convergent finding (same defect class, 8 missions in shard object-1) is real independent corroboration and is credited in SUMMARY.md; only the misplaced file was superseded.

## After shard completion

Per the mission protocol, checked whether object shard 2 was unclaimed: it is claimed and active (`results.jsonl` 559 KB, updated 03:47; shard-3 also claimed). Instead of taking it, performed the falsification alternative: leak-path occurrence analysis proving the static-HTML leak is exactly one site (`ObjectRailSection`) with the adapter gating as proactive coverage of the same class, plus the cross-shard convergence check against shard-1's independent finding. No further shards taken.
