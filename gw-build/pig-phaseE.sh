#!/usr/bin/env bash
# GW-BUILD Phase E: build the candidate image from the committed branch state.
set -u
WT=/home/nolan/ping/worktrees/gw-repair-build
TAG=ping-gateway:repair-cert-20260924
cd "$WT"
echo "=== pre-build: tree must be clean ==="
git status --short
test -z "$(git status --short)" || { echo "TREE NOT CLEAN"; exit 1; }
SHA=$(git rev-parse HEAD)
echo "building $TAG from $SHA"
docker build -f infrastructure/oracle/Dockerfile.gateway \
  --label "org.opencontainers.image.revision=$SHA" \
  --label "org.opencontainers.image.title=ping-gateway repair candidate" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t "$TAG" .
echo "=== image built ==="
docker image inspect "$TAG" --format '{{.Id}} {{.Config.Labels}}'
echo "=== in-image patch presence ==="
docker run --rm "$TAG" sh -c 'grep -c "exteriorAuthMiddleware" /app/gateway/bootstrap/gateway_runtime.js'
docker run --rm "$TAG" sh -c 'grep -c "namespaceForTenantId" /app/ping-runtime/events/event_bridge.js'
docker run --rm "$TAG" sh -c 'grep -c "logical_id" /app/ping-runtime/workers/canonical_workers.js'
echo "=== middleware byte-identity (image vs branch blob) ==="
docker run --rm "$TAG" sha256sum /app/gateway/exterior_auth_middleware.js
git -C /home/nolan/ping show constitutional-convergence-v2:gateway/exterior_auth_middleware.js | sha256sum
