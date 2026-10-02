#!/bin/bash
CF=/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml
echo "=== compose file ==="
cat "$CF"
echo "=== node version in gateway ==="
docker exec ping-gateway node --version 2>&1
echo "=== curl in gateway? ==="
docker exec ping-gateway sh -c 'which curl wget 2>/dev/null || echo "no curl/wget"'
