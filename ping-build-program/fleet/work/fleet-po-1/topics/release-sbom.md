# RELEASE topic: sbom — the boring path that always works
Certification law: every release lists what it is built from.

## PROCEDURE
1. Generate release/SBOM.json from the actual toolchain (stdlib-only python3, bash, coreutils, git) — versions captured live, not asserted.
2. Rule: no pip installs, no vendored deps for fleet workers; if that ever changes, the SBOM gate fails until the new dep is listed with license.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- SBOM written with 8 components (bash, python3, sha256sum, git, grep, find, dd, sqlite3) with live --version strings. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-sbom), release/SBOM.json.
Verdict for all 10 sbom cases: PROVEN.
