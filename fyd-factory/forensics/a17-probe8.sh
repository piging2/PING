#!/bin/bash
# AGENT-17 probe 8: API route inventory (methods, auth, backing) READ-ONLY
set -u
cd /home/nolan/projects/ping || exit 1
for f in $(find src/app/api -name 'route.ts' | sort); do
  echo "=== $f ==="
  grep -n '^export \(async \)\?function \(GET\|POST\|PUT\|PATCH\|DELETE\|HEAD\|OPTIONS\)' "$f" | head -8
  grep -n 'PING_GATEWAY_BASE_URL\|FYD_PING_GATEWAY_BASE_URL\|process.env.KV_REST_API_URL\|getPingObjectGraph\|loadObjectView\|cookies()\|getSession\|verifySignature\|KIT_WEBHOOK_SECRET\|DIAGNOSTIC_SECRET\|isPrivateHost\|DEMO_OWNER' "$f" | head -8
done 2>/dev/null | head -250
