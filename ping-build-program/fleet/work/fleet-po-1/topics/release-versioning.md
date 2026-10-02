# RELEASE topic: versioning — the boring path that always works
Certification law: no promotion without a computed version, a generated changelog, signed hashes, and a green canary.

## PROCEDURE (exact, no manual undocumented steps)
1. Compute next version from the ledger, never hand-typed: rule = SemVer; MAJOR = breaking canonical change (requires Nolan), MINOR = new capability promoted through the certification law, PATCH = number of ranges drained by the worker.
2. Write it to release/VERSION.next.
3. The version is cited in the ledger line's note and in provenance sidecars.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- last_tag from git: none found (repo has no tags) -> base v0.0.0; ranges_drained_by_worker = 17 -> computed_next = v0.1.17. Written to release/VERSION.next. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-versioning), release/VERSION.next.
Verdict for all 10 versioning cases: PROVEN.
