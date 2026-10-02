#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== ingest/safe-fetch URL validation ==="
grep -n -i 'http\|scheme\|protocol\|valid' src/fyd/media/ingest.ts | head -20
echo "--- safe-fetch.ts ---"
grep -n -i 'scheme\|protocol\|allow\|valid\|https\?' src/fyd/media/safe-fetch.ts | head -25
echo "=== manifest variant URL write path ==="
grep -n -B3 -A8 'contentHash' src/fyd/media/derivatives.ts | head -30
