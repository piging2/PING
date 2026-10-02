#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "===== owner-mode/demo-owner-mode.tsx (first 120 lines) ====="
head -120 src/fyd/owner-mode/demo-owner-mode.tsx
echo ""
echo "===== SiteIntent kinds in proceduralize/patch.ts ====="
grep -n "kind:" src/fyd/proceduralize/patch.ts | head -30
grep -n "export type SiteIntent" -A 40 src/fyd/proceduralize/patch.ts | head -60
