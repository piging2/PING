#!/bin/bash
# depcheck3.sh -- capture gateway /health 503 body to identify the failing check.
set -u
NET=ora-depcheck
OUT="${1:-depcheck3-evidence.log}"
: > "$OUT"
log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$OUT"; }
docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null
docker run -d --rm --network "$NET" --name ora-t-postgres \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw -e POSTGRES_DB=crx_runtime \
  postgres:17-alpine >/dev/null
docker run -d --rm --network "$NET" --name ora-t-qdrant qdrant/qdrant:v1.7.0 >/dev/null
docker run -d --rm --network "$NET" --name ora-t-gateway \
  -e NODE_ENV=production -e LOG_LEVEL=WARN \
  -e POSTGRES_HOST=ora-t-postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=crx_runtime \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw \
  -e QDRANT_HOST=ora-t-qdrant -e QDRANT_PORT=6333 \
  ping-gateway:candidate-84486f056 >/dev/null
sleep 45
log "--- GET /health body ---"
docker run --rm --network "$NET" node:24-alpine \
  wget -qO- --timeout=10 --tries=1 "http://ora-t-gateway:8080/health" 2>/dev/null | head -c 2000 | tee -a "$OUT"
echo "" | tee -a "$OUT"
log "--- cleanup ---"
docker rm -f ora-t-postgres ora-t-qdrant ora-t-gateway >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
log "DONE"
