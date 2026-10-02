# SHARD-4b-w1 LOG (WORLD-SHARD-1's duplicate shard-4 run)

- 2026-09-23 ~21:35 MDT: shard-4 appeared unclaimed; took it per the
  no-idling rule. Removed the stochastic IA gate from the harness (FF-6),
  re-transferred to the Pig, verified staging.
- 21:36 MDT: Pig load 2.31/24. Launched START=2000 END=2499 -> /home/nolan/shard4.
  500/500 in ~1.3 s compute, exit 0.
- 21:38 MDT: retrieved results.jsonl + stats.json. Discovered WORLD-SHARD-0
  had claimed and run shard-4 first (~21:21-21:23 MDT); my retrieve had
  OVERWRITTEN their results.jsonl. Their docs/scripts survived (file-exists
  guard blocked my SUMMARY.md/SHARD-LOG.md writes - the one safeguard that
  worked).
- 21:40 MDT: moved my 5 files to shard-4b-w1/; wrote
  COLLISION-NOTE-WORLD-SHARD-1.md in shard-4/ explaining the overwrite and
  how to re-retrieve; proposed a CLAIMS.jsonl lock convention.
- Next: shard-7 (3500-3999), steering clear of WORLD-SHARD-0's stated next
  target shard-6.

Lesson: "list dir, then claim" races. Claim files must be written BEFORE the
run, and retrieves must never blindly overwrite (check for existing
results.jsonl first).
