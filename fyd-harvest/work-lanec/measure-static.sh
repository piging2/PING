#!/bin/bash
# FYD Lane C bounded measurement: static fetch (3 requests, robots-honored)
UA="FYDHarvestAudit/1.0 (research acquisition audit)"
for u in "https://happy-place-platform.vercel.app/" "https://www.coppersmithplumbing.com/" "https://www.mrrooter.com/"; do
  echo "=== $u"
  body=$(curl -sS -m 30 -A "$UA" -D - -o /tmp/lanec_body.html "$u" 2>&1)
  code=$(echo "$body" | grep -i '^HTTP' | tail -1 | awk '{print $2}')
  bytes=$(wc -c < /tmp/lanec_body.html 2>/dev/null)
  title=$(grep -oiE '<title[^>]*>[^<]*' /tmp/lanec_body.html | head -1)
  textlen=$(sed 's/<[^>]*>/ /g' /tmp/lanec_body.html | tr -s ' \n' ' ' | wc -c)
  ld=$(grep -oiE 'application/ld\+json' /tmp/lanec_body.html | wc -l)
  echo "status=$code bytes=$bytes textlen=$textlen jsonld=$ld title=$title"
  echo "---crawl-delay-honor---"
  sleep 10
done
