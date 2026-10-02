#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== PingObject ====="
grep -n "export interface PingObject" -A 25 src/lib/ping/types.ts | head -40
echo "===== FYDSiteSpec required fields ====="
grep -n "export interface FYDSiteSpec" -A 30 src/fyd/sitespec/types.ts | head -40
echo "===== proceduralize/sha256.ts ====="
cat src/fyd/proceduralize/sha256.ts
echo "===== applySitePatch export ====="
grep -n "export function applySitePatch" -A 8 src/fyd/proceduralize/patch.ts | head -14
echo "===== existing intent test style (head) ====="
head -60 src/fyd/customize/__tests__/intent.test.ts
