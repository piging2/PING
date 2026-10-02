#!/bin/bash
# fetch-round2.sh: round 2 for NIGHT-COHORT.
# Modes:
#   retry <sid...>    - re-fetch 403 sites once with a standard browser UA
#   broaden <sid...>  - harvest broader same-host links for thin sites (<=2 pages)
# Same pacing rules: sequential, 2s between requests, max 15 pages/site total.
set -u
cd "$(dirname "$0")"
OUT="../raw"
UA_BROWSER="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
pace() { sleep 2; }

fetch_one() {
  local url="$1" out="$2" ua="$3"
  curl -sSL --max-time 40 --compressed -A "$ua" -o "$out" -w "%{http_code}" "$url" 2>/dev/null || echo "000"
}

site_field() { # $1=sid $2=col
  awk -F'\t' -v s="$1" -v c="$2" 'NR>1 && $1==s {print $c}' sites.tsv
}

broaden_links() { # $1=html $2=base $3=manifest ; prints up to 8 new same-host urls
  local html="$1" base="$2" man="$3"
  grep -oiE 'href="[^"]+"' "$html" 2>/dev/null | sed -E 's/^[Hh][Rr][Ee][Ff]="([^"]*)".*/\1/' \
    | grep -viE '^(mailto:|tel:|javascript:|#)' \
    | grep -viE '\.(pdf|jpe?g|png|gif|webp|svg|css|js|zip|mp4)(\?|$)' \
    | grep -viE '(wp-admin|wp-login|/cart|/checkout|/login|/signup|/account|xmlrpc|/feed/?$|/search)' \
    | sed -E 's/#.*$//' | grep -v '^$' | sort -u \
    | while IFS= read -r h; do
        if [[ "$h" =~ ^https?:// ]]; then echo "$h";
        elif [[ "$h" =~ ^/ ]]; then echo "${base%/}$h";
        else echo "${base%/}/$h"; fi
      done | sort -u > /tmp/broaden-all.txt
  # keep same host, drop already-fetched urls
  local host; host=$(echo "$base" | sed -E 's#^https?://##' | cut -d/ -f1)
  grep -E "^https?://$host" /tmp/broaden-all.txt | grep -vxFf <(grep -oE '"url":"[^"]+"' "$man" | sed -E 's/"url":"//;s/"$//') | head -8
}

mode="$1"; shift
for sid in "$@"; do
  url=$(site_field "$sid" 4)
  d="$OUT/$sid"
  [ -d "$d" ] || { echo "no dir for $sid"; continue; }
  base="${url%/}"
  host=$(echo "$base" | sed -E 's#^https?://##' | cut -d/ -f1)
  echo "=== round2/$mode $sid $url"
  man="$d/manifest.jsonl"

  if [ "$mode" = "retry" ]; then
    rcode=$(fetch_one "$base/robots.txt" "$d/robots-retry.txt" "$UA_BROWSER")
    echo "{\"page\":\"robots.txt\",\"url\":\"$base/robots.txt\",\"status\":$rcode,\"attempt\":\"retry-browser-ua\",\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$man"
    echo "robots.txt -> $rcode"; pace
    if [ "$rcode" = "200" ] && grep -qiE "^[[:space:]]*Disallow:[[:space:]]*/[[:space:]]*$" "$d/robots-retry.txt"; then
      echo "BLOCKED by robots.txt - skipping $sid"
      echo "{\"page\":\"__blocked__\",\"reason\":\"robots-disallow-all\",\"attempt\":\"retry\"}" >> "$man"
      continue
    fi
    hcode=$(fetch_one "$url" "$d/page-00-home.html" "$UA_BROWSER")
    bytes=$(wc -c < "$d/page-00-home.html" 2>/dev/null || echo 0)
    echo "{\"page\":\"home\",\"url\":\"$url\",\"status\":$hcode,\"bytes\":$bytes,\"attempt\":\"retry-browser-ua\",\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$man"
    echo "home -> $hcode ($bytes)"; pace
    if [ "$hcode" != "200" ]; then echo "still failing ($hcode) - recording failure"; continue; fi
    i=1
    have=$(grep -c '"page":"subpage' "$man" || true)
    while IFS= read -r sub; do
      [ -z "$sub" ] && continue
      fn=$(printf "page-%02d.html" $((have + i)))
      scode=$(fetch_one "$sub" "$d/$fn" "$UA_BROWSER")
      sbytes=$(wc -c < "$d/$fn" 2>/dev/null || echo 0)
      echo "{\"page\":\"subpage-$((have + i))\",\"url\":\"$sub\",\"status\":$scode,\"bytes\":$sbytes,\"attempt\":\"retry-browser-ua\",\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$man"
      echo "  sub -> $scode $sub"; i=$((i+1)); pace
    done < <(grep -oiE 'href="[^"]+"' "$d/page-00-home.html" | sed -E 's/^[Hh][Rr][Ee][Ff]="([^"]*)".*/\1/' | grep -viE '^(mailto:|tel:|javascript:|#|//)' | grep -iE '(services|service|about|contact|location|team|staff|people|menu|attorney|practice|product|shop|gallery|our-work)' | sed -E 's/#.*$//' | grep -v '^$' | sort -u | head -24 | while IFS= read -r h; do if [[ "$h" =~ ^https?:// ]]; then echo "$h"; elif [[ "$h" =~ ^/ ]]; then echo "${base%/}$h"; else echo "${base%/}/$h"; fi; done | sort -u | head -8)
  fi

  if [ "$mode" = "broaden" ]; then
    [ -f "$d/page-00-home.html" ] || { echo "no homepage for $sid"; continue; }
    have=$(grep -c '"page":"subpage' "$man" || true)
    i=1
    while IFS= read -r sub; do
      [ -z "$sub" ] && continue
      n=$((have + i)); [ "$n" -gt 14 ] && break
      fn=$(printf "page-%02d.html" $n)
      scode=$(fetch_one "$sub" "$d/$fn" "$UA_BROWSER")
      sbytes=$(wc -c < "$d/$fn" 2>/dev/null || echo 0)
      echo "{\"page\":\"subpage-$n\",\"url\":\"$sub\",\"status\":$scode,\"bytes\":$sbytes,\"attempt\":\"broaden\",\"fetched_at\":\"$(date -u +%FT%TZ)\"}" >> "$man"
      echo "  sub $n -> $scode $sub"; i=$((i+1)); pace
    done < <(broaden_links "$d/page-00-home.html" "$base" "$man")
  fi
  echo "done $sid"
done
echo "ROUND2 COMPLETE"
