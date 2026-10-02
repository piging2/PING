# OBJECT shard-2 SUMMARY (missions 1000-1499)

Continuation shard run by OBJECT-SHARD-1 after shard-1 (factory never idles). Same harness, same mutations, unpatched repo (HEAD e48ef710, read-only).

| outcome | count |
|---|---|
| GENERATED | 493 |
| NEEDS_REVIEW | 7 |

- Determinism mismatches: 0. Unsafe URLs in output: 0. Hidden leaks: 0.
- All 7 NEEDS_REVIEW are the known generic class OBJECT-UNBOUND-RAIL-LEAK (failure unbound_claim_in_output): 4 on trades-a (batch-a-electrician), 3 on hostile fixtures. No new generic classes, no crashes, no validation errors.
- The proposed patch (missions/patches/object-rail-binding-gate.patch) covers these; no new patch needed.
