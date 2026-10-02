#!/bin/bash
# AGENT-17 probe 2: middleware, authorities, env surface (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== middleware.ts ==="
cat src/middleware.ts
echo ""
echo "=== AUTHORITY MODULES (files with Authority in name) ==="
find src -iname '*authority*' -type f | sort
echo "=== LIB TOP-LEVEL (src/lib) ==="
ls src/lib 2>/dev/null | head -80
echo "=== FYD LIB ==="
ls src/fyd 2>/dev/null | head -60
echo "=== ALL process.env KEYS referenced in src ==="
grep -rhoP 'process\.env\.[A-Z0-9_]+' src --include='*.ts' --include='*.tsx' | sort -u
