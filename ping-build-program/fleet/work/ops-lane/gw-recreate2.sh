#!/bin/bash
set -u
echo "=== stop + preserve old gateway (rollback available) ==="
docker stop ping-gateway
docker rename ping-gateway ping-gateway-preopslane
echo "=== create new gateway: identical image/config + healthcheck + mem limit ==="
docker run -d --name ping-gateway \
  --network oracle_ping_internal \
  -p 127.0.0.1:8080:8080 \
  --restart unless-stopped \
  --user nodejs \
  --memory 1g --memory-swap 1g \
  --health-cmd "node -e \"require('http').get('http://127.0.0.1:8080/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\"" \
  --health-interval 30s --health-timeout 10s --health-retries 3 --health-start-period 40s \
  --env-file <(docker inspect ping-gateway-preopslane --format '{{range .Config.Env}}{{println .}}{{end}}') \
  ping-gateway:candidate-3c5d280dd node gateway/server.js
echo "run_exit=$?"
echo "=== watch health transition ==="
for i in $(seq 1 18); do
  st=$(docker inspect ping-gateway --format '{{.State.Health.Status}}' 2>/dev/null)
  echo "$(date -u +%T) health=$st"
  [ "$st" = "healthy" ] && break
  [ "$st" = "unhealthy" ] && { echo "UNHEALTHY - rolling back"; docker rm -f ping-gateway; docker rename ping-gateway-preopslane ping-gateway; docker start ping-gateway; echo "rolled back"; exit 3; }
  sleep 10
done
echo "=== final state ==="
docker inspect ping-gateway --format 'health={{.State.Health.Status}} mem={{.HostConfig.Memory}} image={{.Config.Image}} healthcmd={{json .Config.Healthcheck.Test}}'
docker ps --format '{{.Names}} {{.Status}}' | grep gateway
curl -s -o /dev/null -w '/health -> %{http_code} %{time_total}s\n' http://127.0.0.1:8080/health
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep gateway
