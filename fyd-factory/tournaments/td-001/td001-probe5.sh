#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== src/fyd/sitespec/schemas.ts lines 100-300 ====="
sed -n '100,300p' src/fyd/sitespec/schemas.ts
