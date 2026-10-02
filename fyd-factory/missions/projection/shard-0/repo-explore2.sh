#!/bin/bash
cd /home/nolan/projects/ping
echo "=== ask dir ==="
ls src/fyd/ask/
echo "=== projection files ==="
find src -type f -iname "*projection*" | head -20
echo "=== sitespec files ==="
find src -type f \( -iname "*sitespec*" -o -iname "*site-spec*" -o -iname "*site_spec*" \) | head -20
echo "=== concierge files ==="
find src -type f -iname "*concierge*" | head -20
