# FYD Factory Wave-2 Scoreboard

Worker: wave2-gen-9b2f35ec
Date: 2026-09-24
Pig tree: /home/nolan/projects/ping @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (read-only for this worker; SEC-FIX hunks verified live)

## OBJECT

| Shard | Missions | Records | GENERATED_WITH_WARNINGS | NEEDS_REVIEW | Determinism | Rendered unsafe URLs | Hidden-object leaks | Unbound claim sections |
|---|---|---|---|---|---|---|---|---|
| shard-5 | 2500-2999 | 500 | 459 | 41 | 500/500 | 0 | 0 | 1,203 |
| shard-6 | 3000-3499 | 500 | 454 | 46 | 500/500 | 0 | 0 (3192 was a substring false positive) | 1,195 |

- All shard-5 reviews (41) and 45 of 46 shard-6 reviews are the known phone-conflict dial-action class (covered by patch 0002).
- No new generic OBJECT defect found. Improve-once did not fire.
- Artifacts: missions/object/shard-5/ and missions/object/shard-6/ (records, digests, summaries).

## DECISION

| Shard | Range | Definitions | Backlog appended | Backlog skipped |
|---|---|---|---|---|
| shard-2 | D-503..D-752 | 250 | 250 | 0 |
| shard-3 | D-753..D-1002 | 250 | 250 | 0 |

- Both shards carry results.jsonl + definitions.jsonl (explicit 18-field records, synthetic:true, testing_only:true, no em dashes) + CLAIM.md + SUMMARY.md + SHARD-LOG.md.
- Shard-3 verdicts: AUTO_EXECUTE 41, AUTO_EXECUTE_AND_NOTIFY 5, DEEP_REVIEW 187, DEFER 4, GATHER_MORE_EVIDENCE 4, HUMAN_DECISION 9.
- Decision corpus now spans D-001..D-1002.

## ADVERSARIAL

| Batch | Jobs | Terminal | Determinism | Rendered unsafe URLs | Hidden-object leaks | Crashes |
|---|---|---|---|---|---|---|
| 40 hostile compile fixtures | 40 | 40/40 COMPILED | 40/40 | 0 (40 hostile inputs neutralized) | 0 | 0 |
| 200 hostile /o missions | 200 | 196 PASS / 4 FAIL / 0 CRASH | 200/200 | 0 executable-scheme hrefs | 0 private-object leaks | 0 |

- Compile batch: pipeline 6a1b500c124d, harness 1.2.0, queue drained {"done":40}, 0 errors. 205 unbound claim sections (informational).
- /o batch: pipeline 88547e687dd7eb33 (tree moved between runs by another lane; SEC-FIX intact in both). The 4 FAILs are worker expectation errors, not rail failures: two legitimate URLs misclassified as hostile (OADV-014, OADV-015), one by-design minimal-gate shape (OADV-089), one sanitize-vs-reject strictness (OADV-103, zero-width char stripped, clean href emitted).
- Artifacts: missions/adversarial/hostile-compile-wave2/ and missions/adversarial/o-page-hostile/ (fixtures/missions, manifests, results, logs, ADVERSARIAL-REPORT.md, SUMMARY.md).

## IMPROVE-ONCE

Not triggered. No new generic defect class occurred in 3+ missions across OBJECT shards, the compile batch, or the /o batch. No new patch proposed this wave. Pre-existing patches 0001 (claim badge) and 0002 (phone dial gating) stand.

## PATCHES

None new proposed by this worker.

## CLAIMS

object/shard-5, object/shard-6, decision/shard-2, decision/shard-3: all work complete and validated; claims released after final validation.
