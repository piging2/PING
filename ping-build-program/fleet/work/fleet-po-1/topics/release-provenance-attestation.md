# RELEASE topic: provenance-attestation — the boring path that always works
Certification law: every promoted batch carries who/what/when/from-what.

## PROCEDURE
1. For each promoted range, write a provenance sidecar: artifact path, produced_by worker, generator sha256, the ledger line, and the full input list (matrix TSV, topic docs, measurements, drills).
2. The sidecar lets morning review re-derive the batch byte-identically.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- PROVENANCE.perfops-0001-0050.json written with generator_sha256 95abc6fd55384b7a..., ledger line, and 4 inputs. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-provenance-attestation), release/PROVENANCE.perfops-0001-0050.json.
Verdict for all 10 provenance-attestation cases: PROVEN.
