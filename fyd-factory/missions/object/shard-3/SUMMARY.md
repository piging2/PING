# OBJECT shard-3 SUMMARY (missions 1500-1999)

Continuation shard run by OBJECT-SHARD-1 after shard-1 (factory never idles). Same harness, same mutations, unpatched repo (HEAD e48ef710, read-only). Deliberately run unpatched to replicate the generic class.

| outcome | count |
|---|---|
| GENERATED | 494 |
| NEEDS_REVIEW | 6 |

- Determinism mismatches: 0. Unsafe URLs in output: 0. Hidden leaks: 0.
- All 6 NEEDS_REVIEW are the known generic class OBJECT-UNBOUND-RAIL-LEAK (failure unbound_claim_in_output): missions 1614, 1761, 1774, 1819, 1841, 1974 (hostile-rtl, hostile-nojsonld, batch-a-electrician fixtures). Class replicated; no new generic classes, no crashes, no validation errors.
- The proposed patch (missions/patches/object-rail-binding-gate.patch) covers these; no new patch needed.
