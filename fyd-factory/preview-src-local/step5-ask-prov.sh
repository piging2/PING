#!/bin/bash
set -uo pipefail
PORT=$(cat /tmp/fyd-preview-port.txt)
echo "=== Ask Happy Place: 'How do you know?' ==="
curl -s "http://localhost:$PORT/preview/ask?site=happy-place&q=How+do+you+know" | python3 -c "
import sys, re, html
text = sys.stdin.read()
text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'<[^>]+>', ' ', text)
text = html.unescape(text)
text = re.sub(r'\s+', ' ', text).strip()
idx = text.find('Question')
if idx > 0:
    print(text[idx:idx+2500])
else:
    print(text[:2500])
"
