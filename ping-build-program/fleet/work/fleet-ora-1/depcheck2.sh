#!/bin/bash
# depcheck2.sh -- corrected isolated probes (probe from dedicated probe container).
set -u
NET=ora-depcheck
OUT="${1:-depcheck2-evidence.log}"
: > "$OUT"
log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$OUT"; }

docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null

probe() { # probe <host> <port> <path> -> prints HTTP code or CURLFAIL
  docker run --rm --network "$NET" node:24-alpine \
    wget -qO- --timeout=8 --tries=1 "http://$1:$2$3" -S 2>&1 | head -3 || echo PROBE-ERR
}

log "--- postgres (recheck not needed; already PROVEN) ---"
docker run -d --rm --network "$NET" --name ora-t-postgres \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw -e POSTGRES_DB=crx_runtime \
  postgres:17-alpine >/dev/null
docker run -d --rm --network "$NET" --name ora-t-qdrant qdrant/qdrant:v1.7.0 >/dev/null
sleep 8

log "--- qdrant corrected probe ---"
QCODE="$(probe ora-t-qdrant 6333 / | head -1)"
log "qdrant GET / -> $QCODE"
if echo "$QCODE" | grep -qiE "200|title.*qdrant"; then log "qdrant VERDICT=PROVEN (corrected probe)"; else log "qdrant VERDICT=FAIL ($QCODE)"; fi

log "--- gateway candidate-84486f056 corrected probe ---"
docker run -d --rm --network "$NET" --name ora-t-gateway \
  -e NODE_ENV=production -e LOG_LEVEL=WARN \
  -e POSTGRES_HOST=ora-t-postgres -e POSTGRES_PORT=5432 -e POSTGRES_DB=crx_runtime \
  -e POSTGRES_USER=ping -e POSTGRES_PASSWORD=depcheck-pw \
  -e QDRANT_HOST=ora-t-qdrant -e QDRANT_PORT=6333 \
  ping-gateway:candidate-84486f056 >/dev/null
GREADY=0
for i in $(seq 1 40); do
  GCODE="$(probe ora-t-gateway 8080 /health | head -1)"
  if echo "$GCODE" | grep -qiE "HTTP/1.1 200|HTTP/1.0 200"; then log "gateway GET /health -> 200 after ${i}x3s"; GREADY=1; break; fi
  sleep 3
done
[ "$GREADY" = 0 ] && log "gateway last /health probe -> $GCODE"
GWLOG_ACT="$(docker logs ora-t-gateway 2>&1 | grep -cE "RECOMMENDATION_CREATED|Poll cycle complete" || true)"
log "gateway runtime activity lines (EventBridge/Recommendation) = $GWLOG_ACT"
if [ "$GREADY" = 1 ]; then
  log "gateway VERDICT=PROVEN (isolated /health 200 with declared deps postgres+qdrant only)"
else
  log "gateway VERDICT=NEEDS-REVIEW (/health not 200 in 120s; activity=$GWLOG_ACT; see logs)"; docker logs ora-t-gateway 2>&1 | tail -8 | tee -a "$OUT"
fi

log "--- ollama corrected probe ---"
docker run -d --rm --network "$NET" --name ora-t-ollama ollama/ollama:latest >/dev/null
OREADY=0
for i in $(seq 1 20); do
  OCODE="$(probe ora-t-ollama 11434 /api/tags | head -1)"
  if echo "$OCODE" | grep -qiE "HTTP/1.1 200"; then log "ollama GET /api/tags -> 200 after ${i}x3s"; OREADY=1; break; fi
  sleep 3
done
[ "$OREADY" = 1 ] && log "ollama VERDICT=PROVEN (isolated /api/tags 200, zero declared deps)" || log "ollama VERDICT=FAIL (last: $OCODE)"

log "--- cleanup ---"
docker rm -f ora-t-postgres ora-t-qdrant ora-t-gateway ora-t-ollama >/dev/null 2>&1 || true
docker network rm "$NET" >/dev/null 2>&1 || true
log "DONE"
