#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== ls lib/ping ====="
ls src/lib/ping/
echo "===== ls fyd/boundary ====="
ls src/fyd/boundary/ 2>/dev/null
echo "===== sizes ====="
wc -c src/lib/ping/ask-composer.ts src/lib/ping/types.ts src/fyd/ask/visitor-answer.ts 2>/dev/null
mkdir -p /tmp/laneg-read2
cp src/lib/ping/types.ts /tmp/laneg-read2/ping-types.ts
cp src/lib/ping/ask-composer.ts /tmp/laneg-read2/ask-composer.ts
ls src/fyd/boundary/__tests__/ 2>/dev/null
