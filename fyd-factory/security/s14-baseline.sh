#!/bin/bash
set -u
# Check baseline render for event-handler-like attributes and executable schemes
for f in /tmp/fyd-render/home.html /tmp/fyd-render/about.html /tmp/fyd-render/services.html; do
  echo "=== $f ==="
  echo -n "on*-attr matches: "; grep -oiE '\son[a-z]+\s*=' "$f" | sort | uniq -c | head -10
  echo -n "script tags: "; grep -oiE '<script' "$f" | wc -l
  echo -n "svg tags: "; grep -oiE '<svg' "$f" | wc -l
  echo -n "href/src with bad scheme: "; grep -oiE '(href|src|action)="[^"]*(javascript|data|vbscript|file|blob):' "$f" | head -5
done
echo "=== ObjectVisibility values ==="
grep -n -B2 -A4 'ObjectVisibility' /home/nolan/projects/ping/src/lib/ping/types.ts | head -20
