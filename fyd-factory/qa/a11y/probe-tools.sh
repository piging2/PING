#!/bin/bash
# QA-A11Y probe 3: what HTML parsers are available on Pig WSL + save page HTML
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== node ==="
node --version 2>/dev/null || echo "no node"
echo "=== cheerio/jsdom in repo ==="
ls node_modules/cheerio 2>/dev/null >/dev/null && echo "cheerio YES" || echo "cheerio no"
ls node_modules/jsdom 2>/dev/null >/dev/null && echo "jsdom YES" || echo "jsdom no"
ls node_modules/axe-core 2>/dev/null >/dev/null && echo "axe-core YES" || echo "axe-core no"
echo "=== fetch pages ==="
mkdir -p /home/nolan/transfer/qa-a11y 2>/dev/null || mkdir -p /tmp/qa-a11y
OUT=/tmp/qa-a11y
mkdir -p $OUT
curl -s --max-time 30 "http://localhost:3100/sites/coppersmith-plumbing" -o $OUT/copper.html
curl -s --max-time 30 "http://localhost:3100/sites/happy-place" -o $OUT/happy.html
wc -c $OUT/copper.html $OUT/happy.html
echo "=== python bs4? (fallback) ==="
python3 -c "import bs4; print('bs4 YES')" 2>/dev/null || echo "bs4 no"
