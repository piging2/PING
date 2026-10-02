#!/bin/bash
# prescreen.sh: robots.txt + homepage only, platform detection for cohort-2 selection.
# Read-only, sequential, 2s pacing between ALL requests.
set -u
cd "$(dirname "$0")"
OUT="../raw-prescreen"
UA="FYD-Factory-Acquisition-Test/1.0 (read-only research crawl; paced 2s; no forms, no login)"
mkdir -p "$OUT"
pace() { sleep 2; }

fetch_one() {
  local url="$1" out="$2"
  local code
  code=$(curl -sSL --max-time 40 --compressed -A "$UA" -o "$out" -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "$code"
}

detect() {
  # $1=html file ; prints platform verdict
  local f="$1"
  [ ! -s "$f" ] && { echo "EMPTY"; return; }
  local h
  h=$(tr 'A-Z' 'a-z' < "$f" | head -c 400000)
  local tags=""
  case "$h" in
    *wp-content*|*wp-includes*|*wordpress*) tags="$tags wordpress" ;;
  esac
  case "$h" in
    *wixstatic*|*"wix.com"*|*wixsite*) tags="$tags wix" ;;
  esac
  case "$h" in
    *squarespace*|*static1.squarespace*|*sqs-block*) tags="$tags squarespace" ;;
  esac
  case "$h" in
    *webflow*|*website-files.com*) tags="$tags webflow" ;;
  esac
  case "$h" in
    *shopify*|*cdn.shop*) tags="$tags shopify" ;;
  esac
  case "$h" in
    *__next_data__*|*_next/static*) tags="$tags nextjs" ;;
  esac
  case "$h" in
    *id=\"root\"*|*id=\"app\"*|*data-reactroot*) tags="$tags react-shell" ;;
  esac
  case "$h" in
    *square.site*|*squareup*) tags="$tags square-site" ;;
  esac
  case "$h" in
    *godaddy*|*websitebuilder*) tags="$tags godaddy-builder" ;;
  esac
  case "$h" in
    *duda*) tags="$tags duda" ;;
  esac
  local gen
  gen=$(grep -oiE '<meta[^>]+name="generator"[^>]+content="[^"]+"' "$f" | head -1)
  echo "signals:$tags | generator: $gen"
}

while IFS=$'\t' read -r sid cat name url; do
  [ -z "$sid" ] && continue
  case "$sid" in \#*) continue;; esac
  d="$OUT/$sid"
  mkdir -p "$d"
  base="${url%/}"
  host=$(echo "$base" | sed -E 's#^https?://##' | cut -d/ -f1)
  scheme=$(echo "$base" | grep -oE '^https?' || echo https)
  rcode=$(fetch_one "$scheme://$host/robots.txt" "$d/robots.txt")
  pace
  blocked="no"
  if [ "$rcode" = "200" ] && grep -qiE "^[[:space:]]*Disallow:[[:space:]]*/[[:space:]]*$" "$d/robots.txt"; then
    blocked="yes"
  fi
  hcode="---"; bytes=0; verdict="ROBOTS-BLOCKED"
  if [ "$blocked" = "no" ]; then
    hcode=$(fetch_one "$url" "$d/home.html")
    if { [ "$hcode" = "000" ] || [ "$hcode" -ge 400 ]; } 2>/dev/null; then
      alt=$(echo "$url" | sed -E 's#^https://#http://#;s#^http://#https://#')
      hcode=$(fetch_one "$alt" "$d/home.html")
    fi
    bytes=$(wc -c < "$d/home.html" 2>/dev/null || echo 0)
    verdict=$(detect "$d/home.html")
    pace
  fi
  echo "$sid | robots=$rcode blocked=$blocked | home=$hcode bytes=$bytes | $verdict"
done < candidates.tsv
echo PRESCREEN-COMPLETE
