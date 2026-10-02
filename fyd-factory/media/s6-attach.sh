#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== attach.ts (lines 60-160) ====="
sed -n '60,160p' src/fyd/media/attach.ts
echo "===== bundle-media getPipelineManifest ====="
grep -n "export function getPipelineManifest\|export function getMediaManifest" -A 25 src/fyd/media/bundle-media.ts | head -60
