#!/bin/bash
# refetch.sh: homepage-only fetch for sites un-blocked by the fixed robots parser.
set -u
cd "$(dirname "$0")"
OUT="../raw-prescreen"
UA="FYD-Factory-Acquisition-Test/1.0 (read-only research crawl; paced 2s; no forms, no login)"
fetch_one() {
  local url="$1" out="$2"
  curl -sSL --max-time 40 --compressed -A "$UA" -o "$out" -w "%{http_code}" "$url" 2>/dev/null || echo "000"
}
detect() {
  local f="$1"
  [ ! -s "$f" ] && { echo "EMPTY"; return; }
  local h
  h=$(tr 'A-Z' 'a-z' < "$f" | head -c 400000)
  local tags=""
  case "$h" in *wp-content*|*wp-includes*) tags="$tags wordpress";; esac
  case "$h" in *wixstatic*|*wixsite*) tags="$tags wix";; esac
  case "$h" in *squarespace*|*sqs-block*|*static1.squarespace*) tags="$tags squarespace";; esac
  case "$h" in *webflow*|*website-files.com*) tags="$tags webflow";; esac
  case "$h" in *shopify*|*cdn.shop*) tags="$tags shopify";; esac
  case "$h" in *__next_data__*|*_next/static*) tags="$tags nextjs";; esac
  case "$h" in *showit.co*) tags="$tags showit";; esac
  case "$h" in *spothopper*|*spotapps.co*) tags="$tags spothopper";; esac
  case "$h" in *square.site*) tags="$tags square-online";; esac
  case "$h" in *id=\"root\"*|*id=\"app\"*) tags="$tags react-shell";; esac
  local gen
  gen=$(grep -oiE '<meta[^>]+name="generator"[^>]+content="[^"]+"' "$f" | head -1)
  echo "signals:$tags | generator: $gen"
}
while IFS=$'\t' read -r sid url; do
  [ -z "$sid" ] && continue
  case "$sid" in \#*) continue;; esac
  d="$OUT/$sid"; mkdir -p "$d"
  hcode=$(fetch_one "$url" "$d/home.html")
  bytes=$(wc -c < "$d/home.html" 2>/dev/null || echo 0)
  echo "$sid | home=$hcode bytes=$bytes | $(detect "$d/home.html")"
  sleep 2
done < refetch.tsv
echo REFETCH-COMPLETE
