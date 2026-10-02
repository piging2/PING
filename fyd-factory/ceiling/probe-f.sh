#!/bin/bash
# F5-CEILING probe F: dimensions, strategy-for-site, site-vectors, fixture graphs
set -e
cd /home/nolan/projects/ping
echo "===== builder/dimensions.ts ====="
cat src/fyd/builder/dimensions.ts
echo ""
echo "===== builder/strategy-for-site.ts ====="
head -120 src/fyd/builder/strategy-for-site.ts
