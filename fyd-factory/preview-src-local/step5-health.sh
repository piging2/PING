#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "Quick health check:"
timeout 10 curl -s -o /dev/null -w "/fyd-night -> %{http_code} (%{time_total}s)\n" "http://localhost:$PORT/fyd-night" || echo "TIMEOUT or FAILED"
echo "Server process:"
ps aux | grep "next start" | grep -v grep | head -3
