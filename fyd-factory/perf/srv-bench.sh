#!/bin/bash
# Server render + payload benchmark. Runs INSIDE Pig WSL (needs localhost:3100).
# Usage: srv-bench.sh
set -e
BASE="http://localhost:3100"
OUT=~/fyd-perf/srv
mkdir -p "$OUT"
for SITE in coppersmith-plumbing happy-place; do
  URL="$BASE/sites/$SITE"
  # warmup (route compile)
  curl -s -o /dev/null --max-time 60 "$URL"
  # TTFB: 10 samples, time_starttransfer in ms
  : > "$OUT/ttfb-$SITE.txt"
  for i in $(seq 1 10); do
    curl -s -o /dev/null --max-time 60 -w '%{time_starttransfer}\n' "$URL" >> "$OUT/ttfb-$SITE.txt"
    sleep 1
  done
  # full HTML
  curl -s --max-time 60 "$URL" -o "$OUT/page-$SITE.html"
  echo "SITE=$SITE html_bytes=$(stat -c%s "$OUT/page-$SITE.html")"
  # asset URLs
  grep -oE 'src="[^"]+"' "$OUT/page-$SITE.html" | sed 's/^src="//;s/"$//' | grep '^/' | grep -v '^//$' | sort -u > "$OUT/scripts-$SITE.txt" || true
  grep -oE 'href="[^"]+\.css[^"]*"' "$OUT/page-$SITE.html" | sed 's/^href="//;s/"$//' | grep '^/' | sort -u > "$OUT/css-$SITE.txt" || true
  grep -oE '<link[^>]*rel="stylesheet"[^>]*>' "$OUT/page-$SITE.html" | grep -oE 'href="[^"]+"' | sed 's/^href="//;s/"$//' | grep '^/' | sort -u >> "$OUT/css-$SITE.txt" || true
  # image urls (img src + srcset first entries)
  grep -oE '<img[^>]*>' "$OUT/page-$SITE.html" | grep -oE 'src="[^"]+"' | sed 's/^src="//;s/"$//' | sort -u > "$OUT/imgs-$SITE.txt" || true
  grep -oE 'srcset="[^"]+"' "$OUT/page-$SITE.html" | sed 's/^srcset="//;s/"$//' | tr ',' '\n' | awk '{print $1}' | sort -u >> "$OUT/imgs-$SITE.txt" || true
  sort -u "$OUT/imgs-$SITE.txt" -o "$OUT/imgs-$SITE.txt" || true
done
echo DONE
ls -la "$OUT"
