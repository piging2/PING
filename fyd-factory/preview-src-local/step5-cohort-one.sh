#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "Testing one cohort route with 60s timeout:"
timeout 60 curl -s -o /dev/null -w "bemis-electric -> %{http_code} (%{time_total}s)\n" "http://localhost:$PORT/fyd-night/cohort/bemis-electric"
