#!/bin/bash
cd /home/nolan/projects/ping
echo "=== worktree diff of renderer.tsx (other lane's changes) ==="
git diff --stat -- src/fyd/components/renderer.tsx
git diff -- src/fyd/components/renderer.tsx | head -120
echo "=== untracked test file (first 60 lines) ==="
head -60 src/fyd/components/__tests__/mobile-visibility.test.ts
