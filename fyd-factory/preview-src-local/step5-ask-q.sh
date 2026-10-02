#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "=== Ask Happy Place: 'What services do you offer?' ==="
curl -s "http://localhost:$PORT/preview/ask?site=happy-place&q=What+services+do+you+offer" | python3 -c "
import sys, re, html
text = sys.stdin.read()
text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'<[^>]+>', ' ', text)
text = html.unescape(text)
text = re.sub(r'\s+', ' ', text).strip()
# Find the answer section
idx = text.find('Answer')
if idx > 0:
    print(text[idx:idx+2000])
else:
    print(text[:2000])
"
