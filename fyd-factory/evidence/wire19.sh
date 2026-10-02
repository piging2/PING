#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
echo "---"
for p in sites-wire-p1-footer-provenance sites-wire-p2-rights-inferred sites-wire-p4-render-audit sites-wire-p5-verifier-reconciliation; do
  f="/mnt/c/Users/nolan/transfer/$p.patch"
  if git apply --check "$f" 2>/tmp/check_err.txt; then
    echo "PASS: $p"
  else
    echo "FAIL: $p"
    cat /tmp/check_err.txt
  fi
done
git status --short | head -20
