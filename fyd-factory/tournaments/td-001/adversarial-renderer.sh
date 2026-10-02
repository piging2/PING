#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== renderer.ts:100-130 (all-query resolution) ==="
sed -n '100,130p' src/fyd/components/renderer.tsx
echo "=== ObjectFeedSection: how it filters objects ==="
grep -n "function ObjectFeedSection" src/fyd/components/renderer.tsx
awk '/function ObjectFeedSection/,/^}/' src/fyd/components/renderer.tsx | head -60
echo "=== SCHEMA_ROLES entries (service/post/article/location/person) ==="
grep -n -A6 "service:\|post:\|article:\|location:\|person:" src/fyd/sitespec/schemas.ts | head -40
