#!/bin/bash
# W4 Audit A - recon3: PING knowledge backend (ping-object-reader) + corpus
set -u
WT=/tmp/w4-audit-ping
echo "=== A. lib/ping contents ==="
ls "$WT/src/lib/ping/" | head -40
echo "=== B. ping-object-reader size + corpus source ==="
wc -l "$WT/src/lib/ping/ping-object-reader.ts" 2>/dev/null
grep -n "readFile\|readFileSync\|join(\|process.cwd\|DATA_DIR\|CORPUS\|var/" "$WT/src/lib/ping/ping-object-reader.ts" 2>/dev/null | head -30
echo "=== C. head of ping-object-reader ==="
head -120 "$WT/src/lib/ping/ping-object-reader.ts" 2>/dev/null
echo "=== D. TESTING.md dogfood ==="
grep -n -i "dogfood" "$WT/TESTING.md" | head -10
