# OBJECT-SHARD-5 LOG

## Decisions at 80%+
- Baseline: clean worktree at e48ef710 (chosen over recording dirty-tree state) because the patch-integration worker is mid-application of rail/SEC-FIX patches; measuring the dirty tree would have mixed patched code into shard-5/6 results and broken comparability with shards 0-4.
- Claim protocol: manual CLAIM.md written at 05:09 MDT after re-list; atomic claim.sh became available mid-run (05:15 MDT); claimed all four shards atomically at 05:16 MDT before writing any deliverable. No foreign claims encountered.
- Pig load 2.50 on 24 cores at start: below the 2x-core saturation threshold, no wait needed.
- One bundle for both shards (harness takes start/end args); one invocation per shard per protocol.

## What happened
1. Re-listed missions/object/ and missions/decision/: shards 5,6 (object) and 2,3 (decision) absent. Wrote CLAIM.md markers.
2. Created clean worktree /home/nolan/fyd-wave2-clean at e48ef710 (detached), symlinked node_modules.
3. pig-put harness-object.tsx + build-object.mjs to /home/nolan/fyd-wave2/; sed-repointed imports to the clean tree; first build failed (react-dom/server unresolvable from /home/nolan/fyd-wave2/) -> added node_modules symlink there too; build OK (2.1 MB bundle).
4. Smoke test 2 missions OK. Ran shard-5 (2500-2999): DONE 500, 5,755/min, peak 243 MB.
5. Analyzed: 459 WARNINGS / 41 NEEDS_REVIEW (all phonec-class). Pulled results.jsonl locally (500 lines, all valid, baseline field verified).
6. Re-listed before writing (per parent instruction): no interference. Wrote SUMMARY.md.

## After finishing
- Ran OBJECT shard-6 next (same session), then DECISION shards 2-3 definitions, then adversarial runs. No idle time per the standing invariant.
