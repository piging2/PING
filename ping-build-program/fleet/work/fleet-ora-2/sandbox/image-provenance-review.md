# Image provenance review (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Host: ping-core-01 (129.146.60.17).
Evidence: three-way digest agreement (v3 matrix claim == live `docker images --digests`
2026-09-24 ~05:15 UTC == independent observation 2026-09-24 ~02:33 UTC); arm64/linux
verified for all 8; container linkage verified via `docker inspect` (read-only).

## Per-image verdicts

| image | verdict | rationale |
|---|---|---|
| ping-gateway:candidate-3c5d280dd | ADOPT | pinned sha256:4aa9d7f6..., arm64, running container; condition: record source commit in lockfile; rebuild via pinned Dockerfile |
| ping-gateway:candidate-84486f056 | ADOPT (rollback spare) | pinned sha256:467af2da..., arm64; condition: same provenance recording as above |
| postgres:17-alpine | ADOPT | Docker Hub library/postgres (official), pinned sha256:18cfe3ef..., arm64, running |
| qdrant/qdrant:v1.7.0 | ADOPT | Docker Hub qdrant org, pinned sha256:ff163987..., arm64, running |
| node:24-alpine | ADOPT | Docker Hub library/node (official), pinned sha256:50c8e8ca..., arm64 |
| node:20-alpine | ADOPT | Docker Hub library/node (official), pinned sha256:fb4cd12c..., arm64; reclaimable if confirmed unused |
| node:18-alpine | ADOPT | Docker Hub library/node (official), pinned sha256:8d6421d6..., arm64; reclaimable if confirmed unused |
| ollama/ollama:latest | REJECT the tag, ADOPT the digest | floating :latest tag violates the no-latest invariant; 6.99 GB with no consumer container. Digest sha256:da6e0dc5... is pinned as mitigation. Owner decision: re-tag without :latest and keep (if a local-LLM service is planned) or drop the image. |

## Inventory completeness
Zero untracked images: the live daemon reports exactly 8 images; all 8 are in the
digest-pin lockfile. No unknown blobs.

## Open provenance gaps (owner followups)
1. Provenance attestations / buildinfo for pulled images cannot be verified from the
   local daemon; check the build pipeline (buildx --provenance) or registry.
2. Gateway candidates are local builds: record source commit + Dockerfile path + build
   timestamp in the lockfile.
3. ollama:latest tag: owner decides keep (re-tag) or drop.
