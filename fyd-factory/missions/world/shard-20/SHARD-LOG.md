# WORLD-SHARD-20 LOG

- 2026-09-23 ~22:40 MDT: claimed shard-20 via CLAIMS.jsonl (shard-19 marked
  complete).
- 22:43 MDT: Pig load 2.62/24. Launched START=10000 END=10499 ->
  /home/nolan/shard20. 500/500, exit 0, ~21,700/min.
- Retrieved results.jsonl + stats.json. One NEEDS_REVIEW: world-10265,
  "owner-hidden object leaked into public output".
- 22:45-22:55 MDT: diagnosed world-10265 on the Pig. Root cause: verifier
  false positive. Hidden service "Solar Pro" (visibility:private, correctly
  excluded from graph) is a substring of public business name "Iron Solar
  Pros"; the raw-substring leak check fired. No actual leak.
- Fixed harness stageVerify: word-boundary regex for hidden titles; id
  check unchanged. Regression-tested 10260-10269: world-10265 -> GENERATED,
  neighbors unchanged.
- 22:56-23:00 MDT: reran all 14 shard-dirs (7,000 missions) with the fixed
  harness. All HTML digests byte-identical; exactly one outcome changed
  (world-10265 -> GENERATED). Fixture:
  missions/fixtures/world-hidden-leak-substring-false-positive.json.
- results.jsonl + stats.json promoted for all 14 dirs; stats recomputed
  from new records (latency excludes the harness's own "total" key).
- SUMMARY.md written. Marking shard-20 complete in CLAIMS.jsonl.

Next: no further WORLD claims until the protocol's 5,000-mission WORLD
scope vs beyond-4999 runs is reconciled with the user.
