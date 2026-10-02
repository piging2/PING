#!/bin/bash
echo "=== GET /health ==="
curl -s -o /tmp/hb.txt -w 'HTTP %{http_code} in %{time_total}s\n' http://127.0.0.1:8080/health; head -c 400 /tmp/hb.txt; echo
echo "=== GET / ==="
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:8080/
echo "=== GET /ready /healthz /api/health ==="
for p in /ready /healthz /api/health /api/v1/health; do printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8080$p"; done
echo "=== unauth POST to P0-gated route (expect deny, proves gate path live) ==="
curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST http://127.0.0.1:8080/orchestration/engine/loop -H 'Content-Type: application/json' -d '{}'
echo "=== .env for compose ==="
ls -la /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/.env 2>&1
echo "=== compose config check (does it resolve?) ==="
cd /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle && docker compose config 2>&1 | grep -e 'container_name' -e 'image:' | head
