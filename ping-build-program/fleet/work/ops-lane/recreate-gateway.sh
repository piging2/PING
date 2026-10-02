#!/bin/bash
set -u
cd /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle
echo "=== compose up -d gateway (no --build: reuse existing image) ==="
docker compose -p oracle -f docker-compose.oracle.yml up -d gateway 2>&1 | tail -5
echo "=== container age + health ==="
docker ps --format '{{.Names}} {{.Status}}' | grep gateway
docker inspect ping-gateway --format 'Health test: {{json .Config.Healthcheck.Test}}' 2>/dev/null; echo
echo "=== watch health transition ==="
for i in $(seq 1 12); do
  st=$(docker inspect ping-gateway --format '{{.State.Health.Status}}' 2>/dev/null)
  echo "$(date -u +%T) health=$st"
  [ "$st" = "healthy" ] && break
  sleep 10
done
echo "=== image unchanged? ==="
docker inspect ping-gateway --format '{{.Config.Image}}'
echo "=== mem limit on gateway ==="
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep gateway
