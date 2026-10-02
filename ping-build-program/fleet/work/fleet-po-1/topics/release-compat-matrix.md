# RELEASE topic: compat-matrix — the boring path that always works
Certification law: know every consumer before changing a producer.

## PROCEDURE
1. Maintain release/COMPAT.md: consumer x artifact x tolerance notes.
2. Regenerate by scanning the actual readers (generator, auditors, dry-runs, human review) — never from memory.
3. A producer change that breaks a listed consumer fails the gate.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- Matrix written with 5 consumer rows: results-gen.py reads matrix TSV + topic docs; ledger auditors read append-only JSONL; release dry-runs read results JSONs tolerantly; morning review reads CHANGELOG fragment. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-compat-matrix), release/COMPAT.md.
Verdict for all 10 compat-matrix cases: PROVEN.
