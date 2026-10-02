#!/bin/bash
set -euo pipefail
cd /home/nolan/projects/ping
echo "HEAD: $(git rev-parse HEAD)"
echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "Dirty files: $(git status --porcelain | wc -l)"
if [ -d /home/nolan/fyd-preview-wt ]; then
  echo "WORKTREE_EXISTS"
else
  git worktree add /home/nolan/fyd-preview-wt e48ef710
fi
cd /home/nolan/fyd-preview-wt
echo "WT_HEAD: $(git rev-parse HEAD)"
echo "EXPECTED: e48ef710cb889bf4d59b833ef9766067a9e2bbf0"
[ "$(git rev-parse HEAD)" = "e48ef710cb889bf4d59b833ef9766067a9e2bbf0" ] && echo "SHA_MATCH=YES" || echo "SHA_MATCH=NO"
echo "WT dirty: $(git status --porcelain | wc -l)"
ls vercel.json 2>/dev/null || echo "no vercel.json"
node --version
npm --version
