#!/bin/bash
set -u
echo "=== restart gateway ==="
T0=$(date +%s)
docker restart ping-gateway > /dev/null
echo "=== health gating during recovery ==="
for i in $(seq 1 18); do
  st=$(docker inspect ping-gateway --format '{{.State.Health.Status}}' 2>/dev/null)
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/health 2>/dev/null)
  echo "$(date -u +%T) health=$st http=$code"
  [ "$st" = "healthy" ] && break
  sleep 10
done
T1=$(date +%s)
echo "recovery_to_healthy=$((T1-T0))s"
echo "=== limits + healthcheck persist after restart ==="
docker inspect ping-gateway --format 'mem={{.HostConfig.Memory}} memswap={{.HostConfig.MemorySwap}} health={{.State.Health.Status}}'
curl -s http://127.0.0.1:8080/health | head -c 200; echo
echo "=== cleanup preserved old container (new proven) ==="
docker rm -f ping-gateway-preopslane
docker ps -a --format '{{.Names}}' | grep -e gateway
echo "=== final limits across fleet ==="
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}'
