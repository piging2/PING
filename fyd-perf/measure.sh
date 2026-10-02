#!/bin/bash
# FYD perf baseline: fetch page, enumerate _next/site assets, curl each, sum by type.
site="$1"; base="http://127.0.0.1:3100/sites/$site"
html=$(curl -s "$base")
echo "$html" > /tmp/perf/${site}.html
urls=$(printf '%s' "$html" | grep -oE '"/(_next|sites)/[^"]+"' | tr -d '"' | sort -u)
total=0; reqs=0; js=0; css=0; img=0; fonts=0; other=0; failed=0
echo "=== $site ==="
while read -r u; do
  [ -z "$u" ] && continue
  out=$(curl -s --compressed -o /dev/null -w "%{size_download} %{http_code}" "http://127.0.0.1:3100$u")
  sz=${out%% *}; code=${out##* }
  if [ "$code" = "200" ]; then reqs=$((reqs+1)); total=$((total+sz)); else failed=$((failed+1)); fi
  case "$u" in
    *.js)   js=$((js+sz));;
    *.css)  css=$((css+sz));;
    *.png|*.jpg|*.jpeg|*.webp|*.avif|*.gif|*.svg|*.ico) img=$((img+sz));;
    *.woff2|*.woff|*.ttf) fonts=$((fonts+sz));;
    *)      other=$((other+sz));;
  esac
  echo "$sz $code $u"
done <<< "$urls"
echo "TOTALS reqs_ok=$reqs failed=$failed total_bytes=$total js=$js css=$css img=$img fonts=$fonts other=$other"
