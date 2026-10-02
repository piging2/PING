#!/bin/bash
set -e
cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "NO-GIT-OR-UNKNOWN"
git log --oneline -3 2>/dev/null || true
echo "=== src/fyd/claim layout ==="
find src/fyd/claim -type f | sort
echo "=== __tests__ layout ==="
find src/fyd/claim/__tests__ -type f 2>/dev/null | sort || echo "NO-TESTS-DIR"
echo "=== dir byte sizes ==="
du -sh src/fyd/claim 2>/dev/null || true
