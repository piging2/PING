#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/app/preview/ask/page.tsx"

# Backup for diff record
cp "$F" "$F.orig"

python3 << 'PYEOF'
path = "/home/nolan/fyd-preview-wt/src/app/preview/ask/page.tsx"
with open(path) as f:
    src = f.read()

old_type = "type SearchParams = { site?: string; q?: string } | Promise<{ site?: string; q?: string }>;"
new_type = """// Next.js 15: searchParams is always a Promise. The union with the plain
// object form does not satisfy PageProps (the plain object is not assignable
// to Promise<any>). Runtime behavior is unchanged: the page already awaits
// searchParams below.
type SearchParams = Promise<{ site?: string; q?: string }>;"""

assert old_type in src, "old SearchParams type not found"
src = src.replace(old_type, new_type, 1)

with open(path, "w") as f:
    f.write(src)

print("ask page SearchParams type fixed for Next.js 15")
PYEOF

echo "=== diff ==="
diff "$F.orig" "$F"
echo "=== new SHA256 ==="
sha256sum "$F"
