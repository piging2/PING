#!/bin/bash
node --version 2>/dev/null
ls /home/nolan/projects/ping/node_modules/.bin/ | grep -iE "^(tsx|ts-node|esbuild)$"
echo "=== projection dir ==="
ls -la /home/nolan/ping/var/fyd-projections/ 2>/dev/null | head
for f in coppersmith-plumbing happy-place; do
  p=/home/nolan/ping/var/fyd-projections/$f.json
  [ -f "$p" ] && echo "$f: $(stat -c%s "$p") bytes"
done
echo "=== generator sig ==="
grep -n "export function generateSiteSpec\|export const generateSiteSpec" /home/nolan/projects/ping/src/fyd/proceduralize/generator.ts
echo "=== dev server? ==="
curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3100/ || echo " NO-SERVER"
