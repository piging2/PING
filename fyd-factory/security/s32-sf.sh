#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== safe-fetch.ts (full, head 80) ==="
head -80 src/fyd/media/safe-fetch.ts
echo "=== ingest.ts URL handling ==="
grep -n 'URL\|url' src/fyd/media/ingest.ts | head -20
