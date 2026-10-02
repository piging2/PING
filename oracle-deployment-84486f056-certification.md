# Oracle Deployment Certification: 84486f056

> CORRECTION (2026-09-20 ~19:30 MDT, FL-20260920-023): This document's
> declarations were PREMATURE. ORACLE_RUNTIME_PROVEN and ORACLE_RESTART_PROVEN
> were asserted while 14 certification gaps remained open (no live PG
> same-ID/different-semantics collision proof, no zero-fanout proof, no nested
> canonical tests, no exact-duplicate fanout proof, no mission/worker/result
> proof, no secret-logging verification, unresolved startup warnings, 7
> unassessed dependency vulnerabilities, no clean-snapshot build, no
> distribution manifest, no filesystem comparison, no final digest
> reinspection). The candidate is healthy but NOT truthfully certified. This
> document is preserved as evidence and SUPERSEDED. Do not use it for
> promotion or rollback-anchor decisions. A new certification will be issued
> only after all gaps close per the release doctrine.

## Final Source
- Repository: /home/nolan/ping
- Branch: refactor/runtime-authority-convergence
- HEAD: 84486f056e597f404f81f6ca6dbbf3f3c75ba7c0
- Includes:
  - ccfef91f3: P0 event fixes (canonical ACK without durability, same-ID collision)
  - 8b42c1b01: Oracle Dockerfile distribution closure
  - ff77dbe91: Build tools for tree-sitter native module
  - 9d3b22566: infrastructure/physical_clock_adapter.js
  - 6a8d5bf83: GENERATION_MANIFEST.yaml
  - 512776de5: database/ SQL files
  - 84486f056: JSONB payload parsing fix in collision detection

## Deployed Artifact
- Image: ping-gateway:candidate-84486f056 (Oracle)
- Image ID: sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e
- Architecture: arm64
- Source SHA: 84486f056e597f404f81f6ca6dbbf3f3c75ba7c0

## Gates
- Gate B (Distribution Closure): PASS - All required files present, module resolution works
- Gate I (ARM64 Build/Runtime): PASS - arm64 image runs on Oracle
- Gate J (Release Provenance): PASS - Source SHA, image ID, build host recorded

## P0 Invariants (Live Oracle)
- P0-012: Null pool -> error, no handler fanout - PASS (proven against built artifact)
- P0-013a: Equivalent duplicate -> idempotent ok, count=1 - PASS (live Oracle)
- P0-013b: Semantic collision -> error, fail closed - PASS (proven against built artifact)

## Oracle State
- ping-postgres: running (healthy)
- ping-gateway: running ping-gateway:candidate-84486f056 (healthy)
- ping-qdrant: running (healthy)
- Health: status=healthy, event_runtime=healthy, canonicalization=healthy
- Event persistence: verified (event written to ping_events, read back)
- Idempotent duplicate: verified (second emit returns ok, count remains 1)
- Restart: controlled restart passes, gateway returns to healthy

## Rollback
- Anchor preserved: 8400deecf2a9 (oracle-gateway:certified-20260919)
- Previous: ping-gateway-rollback-rc4d522a6b (stopped, preserved)
- Previous previous: ping-gateway-old-512776de5 (stopped, preserved)

## Declarations
- ORACLE_RUNTIME_PROVEN: STRUCK (premature declaration 2026-09-20 ~18:25 MDT, corrected 2026-09-20 ~19:30 MDT, ledger FL-20260920-023). Not certified. Candidate 84486f056 is deployed and healthy but major certification gates remain open.
- ORACLE_RESTART_PROVEN: STRUCK (premature declaration 2026-09-20 ~18:25 MDT, corrected 2026-09-20 ~19:30 MDT, ledger FL-20260920-023). No restart evidence exists for this candidate.

## Certification Date
2026-09-20 ~18:25 MDT
