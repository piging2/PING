# WORLD-SHARD-8 LOG

## 2026-09-23 ~21:20 MDT: claimed after shard-7 collision

Shard-7 turned out to be concurrently claimed and completed by a sibling worker (500/500 with their own harness). My 5-world smoke had appended 5 foreign-schema lines to their results.jsonl and dropped my scratch files into their directory. Repaired: filtered results.jsonl back to their 500 lines (keyed on their "index" field), removed my run.sh/gen-runner.sh/_harness-body.sh/run-progress.log/run-stats.txt, left their SUMMARY.md/SHARD-LOG.md/harness files untouched. Lesson: check directory contents (not just existence) before claiming; a sibling may be mid-claim. No data of theirs was lost.

Claimed shard-8 (4000-4499) instead: unclaimed, verified empty before writing.

## Decisions at 80%+

- Same parameterized harness; 5-world smoke first (4000-4004) clean.
- First pass flagged hidden-object-leaked x2: diagnosed as id-substring false positive (hidden "w4260-svc-1" vs public "w4260-svc-10" rendered by the renderer). Fixed the check to token boundaries, reran the full shard: 2 -> 0. Propagated the fix to shard-0/4/6 harnesses.

## Run

- One tsx invocation per pass, 500/500, exit 0. Two passes (first for diagnosis, second final). No tree breakage.
- 21 unsafe-urls worlds: all neutralized by the safe-link seam, zero unsafe schemes in output.
- Zero crashes, zero unbound claims, zero validator errors.

## Post-shard

Continuing: next unclaimed is shard-9 (4500-4999), the last WORLD shard. Its address space should include rtl-text, the final untested hostile.
