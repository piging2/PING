#!/bin/bash
set -uo pipefail
# Wait for server to be ready, then test routes
for i in $(seq 1 30); do
  if [ -f /tmp/fyd-preview-port.txt ]; then
    PORT=$(cat /tmp/fyd-preview-port.txt)
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/fyd-night" 2>/dev/null | grep -q "200"; then
      echo "SERVER READY on port $PORT"
      break
    fi
  fi
  sleep 2
done
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "Testing routes on port $PORT:"
echo ""
for route in "/fyd-night" "/sites/happy-place" "/sites/coppersmith-plumbing" "/preview/ask" "/preview/owner-console" "/fyd-night/cohort/bemis-electric" "/fyd-night/cohort/hand-law"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$route" 2>&1)
  echo "$route -> $code"
done
