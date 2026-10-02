#!/bin/bash
cd /home/nolan/projects/ping
grep -rln "SiteClient" src --include="*.tsx" | grep -v __tests__ | head -5
echo "--- import in page ---"
grep -n "SiteClient\|import" src/app/sites/coppersmith-plumbing/page.tsx | head -20
