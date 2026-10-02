#!/bin/bash
cd /home/nolan/projects/ping
grep -n "pub(" src/fyd/components/renderer.tsx | head -20
echo "--- field-visibility.ts ---"
sed -n '1,60p' src/fyd/sitespec/field-visibility.ts
