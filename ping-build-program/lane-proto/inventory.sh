#!/usr/bin/env bash
# Lane PROTO: read-only inventory of existing projections/renderings in PING
set -u
cd /home/nolan/projects/ping
echo "===== REPO ====="
git branch --show-current
git status --short | head -3
echo "===== STRUCTURE TOP LEVEL ====="
ls src | head -40
echo "===== SITE SPEC ====="
grep -rl "SiteSpec" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -25
echo "===== RENDERER / PROJECTION FILES ====="
grep -rli "projection" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -25
echo "===== RSS/FEED ====="
grep -rl -e "rss" -e "feed" -e "sitemap" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -25
echo "===== JSON-LD ====="
grep -rl -e "ld+json" -e "schema.org" -e "application/ld" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -25
echo "===== APP ROUTES ====="
find src/app -maxdepth 4 -type d 2>/dev/null | sort | head -40
echo "===== API ROUTES ====="
find src/app/api -type f 2>/dev/null | sort | head -30
echo "===== ASK SURFACE ====="
grep -rli "ask" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
echo "===== OBJECT MODEL FILES ====="
grep -rl -e "FydObject" -e "PingObject" -e "CanonicalObject" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -15
echo "===== DONE ====="
