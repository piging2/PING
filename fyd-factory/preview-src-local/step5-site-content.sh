#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "=== Happy Place site (first 100 lines of text) ==="
curl -s "http://localhost:$PORT/sites/happy-place" | python3 -c "
import sys, re, html
text = sys.stdin.read()
# Extract text content, crude
text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL)
text = re.sub(r'<[^>]+>', ' ', text)
text = html.unescape(text)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:3000])
"
echo ""
echo "=== CHECK FOOTER ==="
curl -s "http://localhost:$PORT/sites/happy-place" | grep -o "sequences [0-9-]*" | head -3
curl -s "http://localhost:$PORT/sites/happy-place" | grep -oi "website statements" | head -2
