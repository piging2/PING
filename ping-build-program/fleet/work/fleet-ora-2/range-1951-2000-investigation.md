# Range 1951-2000 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1951..2000: family rollback (first 50 of 200; family spans ORA-1951..ORA-2150).
"Rollback: {it} — certified rollback path actually works" (it = release-0..release-19)
Pass criterion: "Rollback {it}: post-rollback digest equals certified baseline digest; FAIL otherwise."

## Evidence (read-only SSH probes)
1. Generator source (gen_matrices.py): items are `[f"release-{i}" for i in range(20)]` — f-string placeholders.
2. Real release inventory on the Oracle host (/opt/ping/releases/):
   - bce92787b0da631ed9218e2255607562c9dff731/ (release keyed by git SHA, Sep 15)
   - RESTORE-2026-09-16.md, pgdata-backup-2026-09-16.sql.gz, ping-source-clean-2026-09-16.tar.gz,
     qdrant-snapshots-2026-09-16/
3. Zero references to "release-0".."release-19" anywhere. The named releases do not exist;
   the pass criterion (roll back release-N, compare to certified baseline digest) is unevaluable.

## Why the concept still matters (real followup design)
A rollback drill is legitimate certification work; it must run on staging, never against the live baseline:
  1. On staging: deploy release SHA bce92787b..., record the certified baseline digest
     (constitutional snapshot digest + gateway image digest + DB row-count/digest chain).
  2. Deploy the next candidate, then roll back to the certified release.
  3. PASS: post-rollback digest byte-equals the certified baseline digest. FAIL: any divergence.
  4. The "certified baseline" must be a recorded artifact (digest + manifest), not tribal knowledge.
Running rollbacks against live production is out of scope for a fleet worker.

## Verdicts
All 50: N-A with justification (release-N are generator-synthesized; no such releases exist).
Followup: regenerate the rollback family from the real release-SHA inventory; run the rollback drill on
staging per the design above.
