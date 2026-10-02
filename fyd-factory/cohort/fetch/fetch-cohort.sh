#!/bin/bash
# fetch-cohort.sh: read-only acquisition fetcher for the NIGHT-COHORT.
# Rules: robots.txt first per site (honored); sequential requests;
# 2s minimum between ALL requests; max 10 pages per site (robots + home + 8 subpages).
# No forms, no logins, no contact, public pages only.
set -u
cd "$(dirname "$0")"
OUT="../raw"
UA="FYD-Factory-Acquisition-Test/1.0 (read-only research crawl; paced 2s; no forms, no login)"
MAX_SUBPAGES=8

mkdir -p "$OUT"

pace() { sleep 2; }

fetch_one() {
  # $1=url $2=outfile ; echoes http status
  local url="$1" out="$2"
  local code
  code=$(curl -sSL --max-time 40 --compressed -A "$UA" \
    -o "$out" -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "$code"
}

robots_allows() {
  # $1=robots file $2=path ; returns 0 if allowed
  local robots="$1" path="$2"
  [ ! -s "$robots" ] && return 0
  # crude: if any "Disallow: /" with empty allow context, treat as blocked
  if grep -qiE "^[[:space:]]*Disallow:[[:space:]]*/[[:space:]]*$" "$robots"; then
    return 1
  fi
  return 0
}

extract_subpages() {
  # $1=html file $2=base url ; prints up to MAX_SUBPAGES absolute URLs
  local html="$1" base="$2"
  grep -oiE 'href="[^"]+"' "$html" 2>/dev/null | sed -E 's/^[Hh][Rr][Ee][Ff]="([^"]*)".*/\1/' \
    | grep -viE '^(mailto:|tel:|javascript:|#|//)' \
    | grep -iE '(services|service|about|contact|location|team|staff|people|menu|attorney|practice|product|shop|gallery|our-work|testimonials|reviews|areas-served|commercial|residential)' \
    | sed -E 's/#.*$//' | grep -v '^$' | sort -u | head -$((MAX_SUBPAGES * 3)) \
    | while IFS= read -r h; do
        if [[ "$h" =~ ^https?:// ]]; then echo "$h";
        elif [[ "$h" =~ ^/ ]]; then echo "${base%/}$h";
        else echo "${base%/}/$h"; fi
      done | sort -u | head -$MAX_SUBPAGES
}

tail -n +2 sites.tsv | while IFS=$'\t' read -r sid cat name url pguess; do
  [ -z "$sid" ] && continue
  d="$OUT/$sid"
  mkdir -p "$d"
  echo "=== $sid ($cat) $url"
  base="${url%/}"
  host=$(echo "$base" | sed -E 's#^https?://##' | cut -d/ -f1)
  scheme=$(echo "$base" | grep -oE '^https?' || echo https)
  : > "$d/manifest.jsonl"

  # 1. robots.txt
  rcode=$(fetch_one "$scheme://$host/robots.txt" "$d/robots.txt")
  echo "{\"page\":\"robots.txt\",\"url\":\"$scheme://$host/robots.txt\",\"status\":$rcode,\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
  echo "robots.txt -> $rcode"
  pace
  if [ "$rcode" = "200" ] && ! robots_allows "$d/robots.txt" "/"; then
    echo "BLOCKED by robots.txt (Disallow: /) - skipping $sid"
    echo "{\"page\":\"__blocked__\",\"reason\":\"robots-disallow-all\"}" >> "$d/manifest.jsonl"
    continue
  fi

  # 2. homepage (try https, fall back to http on failure)
  hcode=$(fetch_one "$url" "$d/page-00-home.html")
  if [ "$hcode" = "000" ] || [ "$hcode" -ge 400 ] 2>/dev/null; then
    alt=$(echo "$url" | sed -E 's#^https://#http://#;s#^http://#https://#')
    hcode=$(fetch_one "$alt" "$d/page-00-home.html")
    url="$alt"; base="${url%/}"
  fi
  bytes=$(wc -c < "$d/page-00-home.html" 2>/dev/null || echo 0)
  echo "{\"page\":\"home\",\"url\":\"$url\",\"status\":$hcode,\"bytes\":$bytes,\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
  echo "home -> $hcode ($bytes bytes)"
  pace
  if [ "$hcode" != "200" ]; then
    echo "homepage fetch failed ($hcode) - skipping subpages for $sid"
    continue
  fi

  # 3. subpages
  i=1
  while IFS= read -r sub; do
    [ -z "$sub" ] && continue
    # skip same-host check: stay on same host only
    shost=$(echo "$sub" | sed -E 's#^https?://##' | cut -d/ -f1)
    if [ "$shost" != "$host" ]; then continue; fi
    fn=$(printf "page-%02d.html" $i)
    scode=$(fetch_one "$sub" "$d/$fn")
    sbytes=$(wc -c < "$d/$fn" 2>/dev/null || echo 0)
    echo "{\"page\":\"subpage-$i\",\"url\":\"$sub\",\"status\":$scode,\"bytes\":$sbytes,\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$d/manifest.jsonl"
    echo "  sub $i -> $scode $sub"
    i=$((i+1))
    pace
  done < <(extract_subpages "$d/page-00-home.html" "$base")
  echo "done $sid"
done
echo "FETCH COMPLETE"
