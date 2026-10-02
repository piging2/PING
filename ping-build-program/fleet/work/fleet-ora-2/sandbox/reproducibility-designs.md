# Design-spec Dockerfiles + gateway rebuild (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). These are build specs for images that do not exist yet
(the workers were never deployed); they are the reproducible-build deliverable for
ORA-0009/0011-0016/0029/0031-0036/0049, not live deployments.

## Gateway multi-stage rebuild (slim, node:24-alpine pinned)
```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_DIGEST=sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
FROM node:24-alpine@${NODE_DIGEST} AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build && npm prune --omit=dev
FROM node:24-alpine@${NODE_DIGEST} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./
COPY --from=builder /build/node_modules ./node_modules
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=60s \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/gateway/bootstrap/gateway_runtime.js"]
```
Notes: digest-pinned base (reproducible); no `npm install --no-save typescript` leftover;
healthcheck exercises the event loop (closes F13); target <350MB (closes F9).

## Worker template (digestion / newsletter / projection / witness / replay)
```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_DIGEST=sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
FROM node:24-alpine@${NODE_DIGEST} AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src/ ./src/
FROM node:24-alpine@${NODE_DIGEST}
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/src ./src
COPY --from=builder /build/package.json ./
# resource limits are set at run time (see F14); depends_on with healthy conditions in compose (see F15/F19)
CMD ["node", "src/workers/WORKER_NAME.js"]
```
Per worker: WORKER_NAME = worker-digestion | worker-newsletter | worker-projection |
worker-witness | worker-replay. Memory 512m-1g at deploy time; depends_on postgres+qdrant healthy.

## python-adapter (python:3.12-alpine arm64)
```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-alpine
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY adapter/ ./adapter/
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8090/health')"
CMD ["python", "-m", "adapter.main"]
```
Note: host python3 is 3.12.3 — image matches the host toolchain generation.

## Reproducibility contract (applies to all above)
1. Base images digest-pinned (see digest-pin-lockfile.json); Dependabot-style digest bumps only.
2. `npm ci` from a committed package-lock.json (never `npm install` at build time).
3. Multi-stage: no build tools, docs, or .git in the runtime layer.
4. Build gate: fail if image >500MB (gateway) / >300MB (workers).
5. Two independent builds must produce identical config digests
   (`docker buildx build --output type=image` digest comparison); any divergence is FAIL with diff.
6. Provenance + SBOM: every production build runs
   `docker buildx build --provenance=true --sbom=true`; the attestation digest is recorded
   alongside the image digest in the lockfile. No :latest tags anywhere in the pin set
   (ollama/ollama:latest is grandfathered only via its pinned digest; the tag must not be
   used for pulls).
7. Base images must be multi-arch with arm64 present; the pinned digest is the arm64-verified
   one from the lockfile (no x86-only layers).
