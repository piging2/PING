#!/bin/bash
cd /home/nolan/projects/ping
echo "===== motion block (current worktree) ====="
grep -n "keyframes fyd-enter" src/fyd/components/renderer.tsx
sed -n '448,466p' src/fyd/components/renderer.tsx
echo "===== ClaimBadge (current) ====="
sed -n '241,250p' src/fyd/components/renderer.tsx
echo "===== hero section (current) ====="
sed -n '943,955p' src/fyd/components/renderer.tsx
echo "===== hero CTA (current) ====="
grep -n 'mt-8 flex flex-wrap gap-3' src/fyd/components/renderer.tsx
echo "===== phoneMethod in Hero (current) ====="
grep -n "phoneMethod" src/fyd/components/renderer.tsx | head -5
echo "===== FydContactLink import (current) ====="
grep -n "FydContactLink" src/fyd/components/renderer.tsx | head -3
echo "===== object-rail autoCss (current) ====="
sed -n '168,176p' src/fyd/components/object-rail.tsx
echo "===== object-rail button (current) ====="
sed -n '203,214p' src/fyd/components/object-rail.tsx
echo "===== FYDThemeTokens / theme.accent available in renderer (current) ====="
grep -n "FYDThemeTokens" src/fyd/components/renderer.tsx | head -3
