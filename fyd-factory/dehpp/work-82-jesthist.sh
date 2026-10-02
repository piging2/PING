#!/bin/bash
cd /home/nolan/projects/ping
git log --oneline -3 -- jest.config.js jest.config.ts jest.config.cjs 2>/dev/null | head -5
git status --porcelain | grep -i "jest\|babel" | head -5
git ls-files | grep -e "^jest" -e "babel" | head -5
echo "=== vitest? ==="
ls vitest.config.* 2>/dev/null; ls node_modules/.bin/vitest 2>/dev/null
