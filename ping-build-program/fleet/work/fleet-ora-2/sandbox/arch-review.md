# Architecture compatibility review (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). Host: ping-core-01 (aarch64, no QEMU, no qemu binfmt handlers).

## Per-image verdicts

| image | verdict | evidence |
|---|---|---|
| ping-gateway:candidate-3c5d280dd | ADOPT | arm64; scratch `node -e` ran clean (arm64/linux), zero exec-format error; runs node 18.20.8 |
| ping-gateway:candidate-84486f056 | ADOPT | arm64; same family as above |
| postgres:17-alpine | ADOPT | arm64; scratch `postgres --version` -> 17.11, clean start |
| qdrant/qdrant:v1.7.0 | ADOPT | arm64; scratch `/qdrant/qdrant --version` -> 1.7.0, clean start |
| node:24-alpine | ADOPT | arm64; scratch `node --version` -> v24.21.0 |
| node:20-alpine | ADOPT | arm64; config NODE_VERSION=20.20.2 |
| node:18-alpine | ADOPT | arm64; config NODE_VERSION=18.20.8 |
| ollama/ollama:latest | ADOPT (image) / REJECT (tag) | arm64; scratch run started the binary (it printed its no-server warning, i.e. the arm64 binary executed); the :latest tag is rejected per the provenance review |

## Findings
- musl is the only libc in play (alpine bases); no glibc-linked native modules observed
  (sharp is a repo dependency but is NOT installed in the gateway image).
- Node-version skew is real: live gateway 18.20.8, host Dockerfile FROM node:20-alpine,
  presentping/package.json has no engines field. The "repo requires 24.x" claim needs a
  source pointer; the rebuild design targets node:24-alpine regardless.
- No exec-format errors anywhere: every image's process starts natively on arm64.
