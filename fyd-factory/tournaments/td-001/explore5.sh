#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== validator.ts ====="
cat src/fyd/sitespec/validator.ts
echo ""
echo "===== generator.ts lines 255-310 ====="
sed -n '255,310p' src/fyd/proceduralize/generator.ts
