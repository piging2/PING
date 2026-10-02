#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== sitespec/types.ts (first 200 lines) ====="
head -200 src/fyd/sitespec/types.ts
echo ""
echo "===== sitespec/field-visibility.ts ====="
cat src/fyd/sitespec/field-visibility.ts
