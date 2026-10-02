#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== em dash scan: all new + edited files ==="
for f in $(git status --porcelain | grep -v "^?? node_modules" | awk '{print $2}'); do
  case "$f" in
    *.ts|*.tsx|*.cjs) if grep -q $'\u2014' "$f" 2>/dev/null; then echo "EMDASH: $f"; fi;;
  esac
done
echo "=== scan complete ==="