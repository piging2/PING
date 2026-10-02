#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/lib/ping/types.ts"

cp "$F" "$F.orig"

python3 << 'PYEOF'
path = "/home/nolan/fyd-preview-wt/src/lib/ping/types.ts"
with open(path) as f:
    src = f.read()

old_type = '''export type ObjectProvenanceKind =
  | "canonical-journal"
  | "website-derived"
  | "overlay-authored";'''

new_type = '''export type ObjectProvenanceKind =
  | "canonical-journal"
  | "website-derived"
  | "website-ingestion"
  | "overlay-authored"
  | "owner"
  | "procedural-fixture";'''

assert old_type in src, "old ObjectProvenanceKind not found"
src = src.replace(old_type, new_type, 1)

with open(path, "w") as f:
    f.write(src)

print("ObjectProvenanceKind expanded with owner, procedural-fixture, website-ingestion")
PYEOF

echo "=== diff ==="
diff "$F.orig" "$F"
