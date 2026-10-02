#!/bin/bash
cd /home/nolan/projects/ping/src/fyd/media || exit 1
for f in media-tokens.ts generated-treatment.ts authority-binding.ts authority-projection.ts; do
  if [ -f "$f" ]; then echo "$f: $(sha256sum < "$f" | awk '{print $1}')"; else echo "$f: MISSING"; fi
done
ls __tests__/ | grep -c test || true
