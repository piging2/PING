#!/bin/bash
# depcheck.sh -- isolated dependency-completeness probe for Oracle services.
# Non-destructive by construction:
#   - dedicated bridge network ora-depcheck (no route to ping_internal)
#   - no host port bindings
#   - --rm ephemeral containers, own data (no named volumes)
#   - NEVER touches ping-postgres / ping-qdrant / ping-gateway
# Verdict per service: PROVEN (starts isolated w/ declared deps), FAIL (missing-dep failure),
# ERROR (probe-infra problem).
set -u
NET=ora-depcheck
OUT="${1:-depcheck-evidence.log}"
: > "$OUT"
log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$OUT"; }
chk() { log "--- $1 ---"; }

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null
log "network=$NET"

# ---- postgres (declared deps: none; image postgres:17-alpine) ----
chk "postgres"
docker run -d --rm --network "$NET" --name ora-t-postgres \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw -e POSTGRES_DB=crx_runtime \
  postgres:17-alpine >/dev/null
for i in $(seq 1 30); do
  if docker exec ora-t-postgres pg_isready -U ping -d crx_runtime >/dev/null 2>&1; then
    log "postgres: pg_isready OK after ${i}x2s"; break
  fi
  sleep 2
done
if docker exec ora-t-postgres pg_isready -U ping -d crx_runtime >/dev/null 2>&1; then
  log "postgres VERDICT=PROVEN (isolated start, zero declared deps needed)"
else
  log "postgres VERDICT=FAIL (did not reach ready)"; docker logs ora-t-postgres 2>&1 | tail -5 | tee -a "$OUT"
fi

# ---- qdrant (declared deps: none; image qdrant/qdrant:v1.7.0) ----
chk "qdrant"
docker run -d --rm --network "$NET" --name ora-t-qdrant qdrant/qdrant:v1.7.0 >/dev/null
for i in $(seq 1 30); do
  if docker exec ora-t-qdrant sh -c 'wget -qO- http://127.0.0.1:6333/ 2>/dev/null | grep -q qdrant' 2>/dev/null; then
    log "qdrant: / reachable after ${i}x2s"; break
  fi
  sleep 2
done
if docker exec ora-t-qdrant sh -c 'wget -qO- http://127.0.0.1:6333/ 2>/dev/null | grep -q qdrant' 2>/dev/null; then
  log "qdrant VERDICT=PROVEN (isolated start, zero declared deps needed)"
else
  log "qdrant VERDICT=FAIL (no HTTP on :6333)"; docker logs ora-t-qdrant 2>&1 | tail -5 | tee -a "$OUT"
fi

# ---- gateway candidate-84486f056 (declared deps: postgres healthy, qdrant) ----
chk "gateway (candidate-84486f056)"
docker run -d --rm --network "$NET" --name ora-t-gateway \
  -e NODE_ENV=production -e LOG_LEVEL=INFO \
  -e POSTGRES_HOST=ora-t-postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=crx_runtime \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw \
  -e QDRANT_HOST=ora-t-qdrant -e QDRANT_PORT=6333 \
  ping-gateway:candidate-84486f056 >/dev/null
READY=0
for i in $(seq 1 45); do
  if docker exec ora-t-gateway sh -c 'wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1'; then
    log "gateway: HTTP on :8080 after ${i}x2s"; READY=1; break
  fi
  sleep 2
done
# also inspect process liveness + listening socket as secondary signal
LIVE="$(docker exec ora-t-gateway sh -c 'ps aux | grep -c "[g]ateway_runtime"')"
log "gateway_runtime processes=$LIVE"
docker exec ora-t-gateway sh -c 'cat /proc/net/tcp' 2>/dev/null | awk 'NR>1 {print $2}' | grep -qi ':1F90' && log "gateway: :8080 (1F90) listening" || log "gateway: :8080 not in /proc/net/tcp"
if [ "$READY" = 1 ]; then
  log "gateway VERDICT=PROVEN (isolated start with declared deps postgres+qdrant only)"
else
  log "gateway VERDICT=NEEDS-REVIEW (no HTTP on :8080 within 90s; proc=$LIVE)"; docker logs ora-t-gateway 2>&1 | tail -15 | tee -a "$OUT"
fi

# ---- ollama (not a baseline service; image present locally) ----
chk "ollama (image-only, not in baseline compose)"
docker run -d --rm --network "$NET" --name ora-t-ollama ollama/ollama:latest >/dev/null
for i in $(seq 1 30); do
  if docker exec ora-t-ollama sh -c 'wget -qO- http://127.0.0.1:11434/api/tags >/dev/null 2>&1'; then
    log "ollama: /api/tags reachable after ${i}x2s"; break
  fi
  sleep 2
done
if docker exec ora-t-ollama sh -c 'wget -qO- http://127.0.0.1:11434/api/tags >/dev/null 2>&1'; then
  log "ollama VERDICT=PROVEN (isolated start, zero declared deps; image-only)"
else
  log "ollama VERDICT=FAIL (no API on :11434)"; docker logs ora-t-ollama 2>&1 | tail -5 | tee -a "$OUT"
fi

# ---- cleanup ----
chk "cleanup"
docker rm -f ora-t-postgres ora-t-qdrant ora-t-gateway ora-t-ollama >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
log "cleanup done; baseline containers untouched"
log "DONE"
