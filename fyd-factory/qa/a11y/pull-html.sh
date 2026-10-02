#!/bin/bash
# QA-A11Y: emit both page HTMLs as base64 for local analysis
set -u
for f in copper happy; do
  echo "###FILE:$f###"
  base64 -w0 /tmp/qa-a11y/$f.html
  echo ""
done
echo "###AXEDEP###"
cd /home/nolan/projects/ping && npm ls axe-core 2>/dev/null | head -8
