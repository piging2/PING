#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== branch/SHA ==="
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
echo ""
echo "=== checking all four ==="
for p in sites-wire-p1-footer-provenance sites-wire-p2-rights-inferred sites-wire-p4-render-audit sites-wire-p5-verifier-reconciliation; do
  if git apply --check "/mnt/c/Users/nolan/transfer/$p.patch" 2>/tmp/err.txt; then
    echo "PASS: $p"
  else
    echo "FAIL: $p"
    head -3 /tmp/err.txt
  fi
done
echo ""
echo "=== worktree status (confirming no files were modified by checks) ==="
git status --short | wc -l
