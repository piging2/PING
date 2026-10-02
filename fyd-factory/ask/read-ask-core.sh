#!/bin/bash
cd /home/nolan/projects/ping
for f in src/fyd/ask/types.ts src/fyd/ask/answer.ts src/fyd/ask/context-builder.ts src/fyd/ask/envelope.ts src/fyd/ask/capabilities.ts src/fyd/ask/site-spec.ts src/fyd/ask/jest.config.cjs; do
  echo "########## $f ##########"
  cat "$f"
  echo
done
