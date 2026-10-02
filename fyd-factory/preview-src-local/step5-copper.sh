#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "=== Coppersmith footer check ==="
curl -s "http://localhost:$PORT/sites/coppersmith-plumbing" | grep -o "sequences [0-9-]*" | head -2
curl -s "http://localhost:$PORT/sites/coppersmith-plumbing" | grep -oi "all claims[^<]*website statements" | head -2
echo ""
echo "=== Coppersmith site text (first 2000 chars) ==="
curl -s "http://localhost:$PORT/sites/coppersmith-plumbing" | python3 -c "
import sys, re, html
text = sys.stdin.read()
text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL)
text = re.sub(r'<[^>]+>', ' ', text)
text = html.unescape(text)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:2000])
"
