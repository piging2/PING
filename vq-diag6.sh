#!/bin/bash
cd /home/nolan/projects/ping
echo "=== non-ASCII bytes in object-rail.tsx ==="
grep -n -P "[^\x00-\x7F]" src/fyd/components/object-rail.tsx | head -10
echo "=== line counts: git object vs worktree ==="
git cat-file -p HEAD:src/fyd/components/object-rail.tsx | wc -l
wc -l < src/fyd/components/object-rail.tsx
echo "=== Pig /tmp space ==="
df -h /tmp | tail -1
echo "=== round-trip: real edit -> diff -> restore -> check ==="
cp src/fyd/components/object-rail.tsx /tmp/or-backup.tsx
sed -i 's/const autoCss =/const autoCssX =/' src/fyd/components/object-rail.tsx
git diff -- src/fyd/components/object-rail.tsx > /tmp/rt.patch
cp /tmp/or-backup.tsx src/fyd/components/object-rail.tsx
git status --porcelain src/fyd/components/object-rail.tsx; echo "(empty above = restored)"
wc -l /tmp/rt.patch
git apply --check --verbose /tmp/rt.patch 2>&1; echo "round-trip exit: $?"
