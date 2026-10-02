#!/bin/bash
# fetch-cohort2.sh: read-only acquisition fetcher for COHORT-2.
# Rules: robots.txt first per site, evaluated with the RFC-9309-aware parser
# (robots_allows.py); sequential requests; 2s minimum between ALL requests;
# max 9 content pages per site (home + 8 subpages). No forms, no logins,
# no contact, public pages only. Failure JSONs for snooks-bbq (403) and
# copeka-coffee (robots-blocked) are written by hand after this runs.
set -u
cd "$(dirname "$0")"
OUT="../raw"
UA="FYD-Factory-Acquisition-Test/1.0 (read-only research crawl; paced 2s; no forms, no login)"
MAX_SUBPAGES=8
mkdir -p "$OUT"
pace() { sleep 2; }

fetch_one() {
  local url="$1" out="$2"
  local code
  code=$(curl -sSL --max-time 40 --compressed -A "$UA" -o "$out" -w "%{http_code}" "$url" 2>/dev/null)
  [ -z "$code" ] && code="000"
  echo "$code"
}

extract_subpages() {
  local html="$1" base="$2"
  grep -oiE 'href="[^"]+"' "$html" 2>/dev/null | sed -E 's/^[Hh][Rr][Ee][Ff]="([^"]*)".*/\1/' \
    | grep -viE '^(mailto:|tel:|javascript:|#|//)' \
    | grep -iE '(services|service|about|contact|location|team|staff|people|menu|attorney|practice|product|shop|gallery|our-work|testimonials|reviews|areas-served|commercial|residential|coffee|order|visit)' \
    | sed -E 's/#.*$//' | grep -v '^$' | sort -u | head -$((MAX_SUBPAGES * 3)) \
    | while IFS= read -r h; do
        if [[ "$h" =~ ^https?:// ]]; then echo "$h";
        elif [[ "$h" =~ ^/ ]]; then echo "${base%/}$h";
        else echo "${base%/}/$h"; fi
      done | sort -u | head -$MAX_SUBPAGES
}

tail -n +2 sites2.tsv | while IFS=$'\t' read -r sid cat name url pguess; do
  [ -z "$sid" ] && continue
  d="$OUT/$sid"
  mkdir -p "$d"
  echo "=== $sid ($cat) $url"
  base="${url%/}"
  host=$(echo "$base" | sed -E 's#^https?://##' | cut -d/ -f1)
  scheme=$(echo "$base" | grep -oE '^https?' || echo https)
  : > "$d/manifest.jsonl"

  rcode=$(fetch_one "$scheme://$host/robots.txt" "$d/robots.txt")
  echo "{\"page\":\"robots.txt\",\"url\":\"$scheme://$host/robots.txt\",\"status\":\"$rcode\",\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
  echo "robots.txt -> $rcode"
  pace
  verdict=$(python3 robots_allows.py "$d/robots.txt" /)
  if [ "$verdict" = "BLOCKED" ]; then
    echo "BLOCKED by robots.txt for user-agent * - skipping $sid"
    echo "{\"page\":\"__blocked__\",\"reason\":\"robots-disallow-all\"}" >> "$d/manifest.jsonl"
    continue
  fi

  hcode=$(fetch_one "$url" "$d/page-00-home.html")
  if [ "$hcode" = "000" ] || [ "$hcode" -ge 400 ] 2>/dev/null; then
    alt=$(echo "$url" | sed -E 's#^https://#http://#;s#^http://#https://#')
    hcode=$(fetch_one "$alt" "$d/page-00-home.html")
    url="$alt"; base="${url%/}"
  fi
  bytes=$(wc -c < "$d/page-00-home.html" 2>/dev/null || echo 0)
  echo "{\"page\":\"home\",\"url\":\"$url\",\"status\":\"$hcode\",\"bytes\":$bytes,\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
  echo "home -> $hcode ($bytes bytes)"
  pace
  if [ "$hcode" != "200" ]; then
    echo "homepage fetch failed ($hcode) - skipping subpages for $sid"
    continue
  fi

  i=1
  while IFS= read -r sub; do
    [ -z "$sub" ] && continue
    shost=$(echo "$sub" | sed -E 's#^https?://##' | cut -d/ -f1)
    if [ "$shost" != "$host" ]; then continue; fi
    fn=$(printf "page-%02d.html" $i)
    scode=$(fetch_one "$sub" "$d/$fn")
    sbytes=$(wc -c < "$d/$fn" 2>/dev/null || echo 0)
    echo "{\"page\":\"subpage-$i\",\"url\":\"$sub\",\"status\":\"$scode\",\"bytes\":$sbytes,\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
    echo "  sub $i -> $scode $sub"
    i=$((i+1))
    pace
  done < <(extract_subpages "$d/page-00-home.html" "$base")
  echo "done $sid"
done
echo "FETCH COMPLETE"
