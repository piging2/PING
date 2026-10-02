#!/bin/bash
OUT=/home/nolan/hpp-pig-route.html
curl -s --max-time 60 http://localhost:3100/sites/happy-place -o "$OUT" -w "pig-route: HTTP %{http_code}, %{size_download} bytes\n" >&2
base64 -w0 "$OUT"
echo ""
rm -f "$OUT"
