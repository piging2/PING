#!/bin/bash
set -u
SNAPDIR=/opt/ping/backups/qdrant
mkdir -p "$SNAPDIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
echo "=== create snapshot ==="
RESP=$(curl -s -X POST http://127.0.0.1:6333/collections/knowledge/snapshots)
echo "$RESP" | head -c 300; echo
SNAME=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['name'])")
echo "snapshot name: $SNAME"
echo "=== download ==="
curl -s -o "$SNAPDIR/knowledge-$TS.snapshot" "http://127.0.0.1:6333/collections/knowledge/snapshots/$SNAME"
ls -la "$SNAPDIR/"
sha256sum "$SNAPDIR/knowledge-$TS.snapshot" | sed "s|$SNAPDIR/||" > "$SNAPDIR/knowledge-$TS.snapshot.sha256"
cat "$SNAPDIR/knowledge-$TS.snapshot.sha256"
echo "=== retention: keep 7 ==="
ls -1t "$SNAPDIR"/knowledge-*.snapshot 2>/dev/null | tail -n +8 | while read -r old; do rm -f "$old" "$old.sha256"; echo "PRUNE $old"; done
echo "=== backup log tail ==="
tail -5 /opt/ping/backups/backup.log
