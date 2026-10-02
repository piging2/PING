# OBJECT shard-4 log (missions 2000-2499)

1. Claimed 2026-09-24 ~03:55 UTC (shards 4, 5, 6 verified absent first; OBJECT-SHARD-1's
   log lists 4/5/6 as unclaimed; taking 4).
2. Reused the validated OBJECT-2 harness (harness-object.tsx) and esbuild bundle
   from /home/nolan/fyd-factory-object2/bundle-object.cjs; same in-memory
   schema-roles redirect (repo untouched). Pig saturation pre-checked earlier
   this session (load 3.63 on 24 cores).
3. Single canonical run, 2000-2499: 500/500, 0 crashes, 0 rows lost.
4. Outcomes: 459 GENERATED_WITH_WARNINGS, 41 NEEDS_REVIEW (all phonec-class).
   Determinism PASS 500/500. Unsafe URL schemes 0. 1,212 unbound claim sections.
5. Replicates the shard-2 duplicate run's two classes on a fresh range:
   phone-conflict dial-action fail-closed violation (41) and claim-badge gap
   corroboration (1,212 unbound sections). No new classes.
6. results.jsonl saved as canonical; piglog copied to transfer, fetched, and
   removed (their-log convention: unique names, remove after fetch).
