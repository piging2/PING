# RELEASE topic: changelog — the boring path that always works
Certification law: no promotion without a generated changelog.

## PROCEDURE
1. Generate the changelog fragment from fleet/ledger.jsonl (deterministic script, no hand-writing): one header line with totals, one bullet per drained range with missions + verdicts.
2. Write to release/CHANGELOG.frag.md.
3. Morning review reads the fragment; the fragment is regenerated, never edited.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- changelog_lines = 18, missions_covered = 850 (17 ranges x 50). PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-changelog), release/CHANGELOG.frag.md.
Verdict for all 10 changelog cases: PROVEN.
