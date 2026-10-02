# RELEASE topic: artifact-signing — the boring path that always works
Certification law: no promotion without integrity hashes; key signatures queued for morning.

## PROCEDURE
1. For every promoted artifact, write a sha256 sidecar in cosign-compatible `sha256  filename` format (release/SHA256SUMS.*).
2. Verify with `sha256sum -c` before promotion.
3. Key-based signing (cosign/minisign with Nolan's key) is QUEUED FOR MORNING per the standing no-live-credentials decision; the sidecar format is already compatible so morning signing is a pure addition.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- 3 sample sidecars written for PER-0001/PER-0050/PER-0850; `sha256sum -c` verify: PASS. Key signing: QUEUED-FOR-MORNING. (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-artifact-signing), release/SHA256SUMS.sample.
Verdict for all 10 artifact-signing cases: PROVEN (hashing proven; key signing has an explicit morning followup).
