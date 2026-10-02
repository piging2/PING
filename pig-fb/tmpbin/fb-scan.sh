#!/bin/bash
GID="$1"; TAG="$2"
OUT="/tmp/fb-scan-$TAG.json"
facebook-cli groups posts --group-id "$GID" --limit 20 --sort-by MOST_RECENT_ACTIVITY > "$OUT" 2>/dev/null
python3 - "$TAG" "$OUT" <<'PYEOF'
import json, sys
tag, path = sys.argv[1], sys.argv[2]
try:
    d = json.load(open(path))
except Exception as e:
    print(f"[{tag}] SCAN_ERROR {e}"); sys.exit()
items = d.get('data', d.get('posts', []))
print(f"[{tag}] posts={len(items)}")
for p in items:
    txt = (p.get('content') or p.get('post_caption') or '').replace('\n',' ')[:115]
    print(f"  - {txt} | {p.get('post_url') or p.get('url')}")
PYEOF
