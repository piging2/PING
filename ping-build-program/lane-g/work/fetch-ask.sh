#!/bin/bash
set -u
cd /home/nolan/projects/ping
mkdir -p /tmp/laneg-read
for f in src/fyd/ask/answer.ts src/fyd/ask/types.ts src/fyd/ask/context-builder.ts src/fyd/ask/envelope.ts src/fyd/ask/capabilities.ts src/fyd/ask/site-spec.ts src/fyd/ask/circle-actions.ts; do
  cp "$f" "/tmp/laneg-read/$(basename "$f")"
done
cp src/app/api/fyd/ask/route.ts /tmp/laneg-read/ask-route.ts
cp src/app/api/fyd/ask/ask-pipeline.ts /tmp/laneg-read/ask-pipeline.ts
ls -la /tmp/laneg-read/
