# RELEASE topic: rollback-plan — the boring path that always works
Certification law: every promotion must have a tested rollback faster than the promotion.

## PROCEDURE
1. Before promoting, snapshot the target channel dir.
2. Promote (atomic per-file renames).
3. On any failed verification: delete the target dir, restore the snapshot, verify integrity by loading a sample JSON.
4. Ledger is append-only: rollback adds a correcting line, never rewrites history.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- Simulated corrupt promotion of PER-0001.json ("CORRUPT"), rolled back from snapshot in 1834 ms; post-rollback integrity: ok (mission_id verified). PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-rollback-plan, rollback_ms 1834).
Verdict for all 10 rollback-plan cases: PROVEN.
