#!/bin/bash
set -u
for f in answer.ts ask-pipeline.ts ask-route.ts capabilities.ts circle-actions.ts context-builder.ts envelope.ts site-spec.ts types.ts; do
  echo "===== FILE: $f ====="
  cat "/tmp/laneg-read/$f"
  echo ""
done
