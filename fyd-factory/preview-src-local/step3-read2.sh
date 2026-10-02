#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== ping-object-source head 120 ==="
head -120 src/fyd/data/ping-object-source.ts 2>/dev/null || ls src/fyd/data/
echo "=== where does getPingObjectGraph read from? ==="
grep -n "fs\.\|readFile\|KV\|UPSTASH\|fetch(" src/fyd/data/ping-object-source.ts | head -20
echo "=== demo-owner-mode ==="
ls src/fyd/owner-mode/ 2>/dev/null
echo "=== owner console? ==="
ls src/app/fyd/ 2>/dev/null; ls src/app/fyd/owner 2>/dev/null
