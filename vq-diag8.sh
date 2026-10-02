#!/bin/bash
cd /home/nolan/projects/ping
echo "=== status of target files ==="
git status --porcelain src/fyd/components/renderer.tsx src/fyd/components/object-rail.tsx src/fyd/components/__tests__/mobile-visibility.test.ts
echo "=== staged files (cached) ==="
git diff --cached --name-only | head -20
echo "=== diff index vs HEAD for renderer (staged changes?) ==="
git diff --cached --stat -- src/fyd/components/renderer.tsx src/fyd/components/object-rail.tsx
echo "=== the generated vq-001 patch ==="
cat /tmp/vq-patches-gen/vq-001-motion-never-gates-content.patch
