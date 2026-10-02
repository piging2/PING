#!/bin/bash
cd /home/nolan/projects/ping
grep -n "buildRenderContext\|RenderContext" src/app/sites/coppersmith-plumbing/page.tsx src/app/sites/happy-place/page.tsx | head
echo "--- how does the page build ctx ---"
sed -n '55,80p' src/app/sites/coppersmith-plumbing/page.tsx
