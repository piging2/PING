#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== build route ==="
head -120 "src/app/build/[siteId]/page.tsx"
echo ""
echo "=== dogfood ==="
ls -R src/fyd/builder/dogfood 2>/dev/null | head -20
