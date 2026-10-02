# Oracle Candidate Certification: 9d3b22566

## Source
- Repository: /home/nolan/ping
- Branch: refactor/runtime-authority-convergence
- HEAD: 9d3b2256602b3310cd3440b7c1a3f3a982aec204
- Includes:
  - ccfef91f3: P0 event fixes (canonical ACK without durability, same-ID collision)
  - 8b42c1b01: Oracle Dockerfile distribution closure
  - ff77dbe91: Build tools for tree-sitter native module
  - 9d3b22566: infrastructure/physical_clock_adapter.js in distribution

## Artifact
- Image: ping-gateway:9d3b22566-arm64 (Pig), ping-gateway:candidate-9d3b22566 (Oracle)
- Image ID: sha256:da27c6c31b0aa012df16237ef143543c7e73b293408dff4296f09b326ad2fbf9
- Architecture: arm64
- OS: linux
- Size: 406,338,218 bytes
- Created: 2026-09-21T00:01:17Z
- Base: node:18-alpine (sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e)
- Build host: Pig (WSL) via isolated Docker config (no credential helper)
- Build command: DOCKER_CONFIG=/tmp/docker-isolated docker buildx build --platform linux/arm64 -f infrastructure/oracle/Dockerfile.gateway -t ping-gateway:9d3b22566-arm64 --load .

## Gate B: Distribution Closure - PASS
- Filesystem verified: /app/gateway/, /app/ping-runtime/, /app/runtime/, /app/infrastructure/physical_clock_adapter.js
- Module resolution: require('/app/ping-runtime/events/unified_event_runtime.js') succeeds in container
- No MODULE_NOT_FOUND errors
- Relative imports (../../ping-runtime, ../../runtime, ../../../infrastructure) resolve correctly

## Gate I: ARM64 Build/Runtime - PASS
- Image architecture: arm64 (verified via docker inspect)
- Built with --platform linux/arm64
- Module loads successfully on Oracle (ARM64 host)
- Node v18.20.8 runtime verified

## Gate J: Release Provenance - PASS
- Source SHA: 9d3b2256602b3310cd3440b7c1a3f3a982aec204
- Distribution manifest: Image ID sha256:da27c6c31b0aa012df16237ef143543c7e73b293408dff4296f09b326ad2fbf9
- Base image digest: sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
- Build host: Pig WSL (direct SSH, healthy)
- Transfer: docker save -> scp -> docker load (verified ID match)
- Unrelated worktree state excluded: build used git HEAD, not worktree files

## P0 Invariants (Behavioral, against built artifact)
- P0-012: Null pool -> emit returns error "No persistence available", handler does NOT fire - PASS
- P0-013a: Equivalent duplicate (same ID, same semantics) -> idempotent ok - PASS
- P0-013b: Semantic collision (same ID, different semantics) -> error "Event ID collision", fail closed - PASS

## Certification Date
2026-09-20 ~18:05 MDT

## Certified By
Pigi (autonomous execution, Nolan's directive: FIX THE SHIPMENT, CERTIFY THE SHIPMENT, DEPLOY THE SHIPMENT)
