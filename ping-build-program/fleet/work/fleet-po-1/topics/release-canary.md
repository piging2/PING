# RELEASE topic: canary — the boring path that always works
Certification law: promote one artifact first; batch only after the canary verifies.

## PROCEDURE
1. Write the canary artifact via atomic tmp+rename.
2. Validate it (JSON parses; schema fields present).
3. Only then promote the batch; the generator promotes per-file atomically, so a mid-batch crash leaves a mix of old-complete and new-complete files, never partial ones.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- REL-0001.json promoted alone first; canary_check: valid-json. Batch rule documented. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-canary).
Verdict for all 10 canary cases: PROVEN.
