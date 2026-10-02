#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== registerSiteSpecProvider callers ==="
grep -rn -e 'registerSiteSpecProvider' src --include='*.ts' | grep -v -e 'site-spec.ts' | head -8
echo "=== fixture record counts ==="
for f in happy-place-graph coppersmith-graph happy-place-rich-graph; do
  p="src/fyd/proceduralize/__fixtures__/$f.ts"
  if [ -f "$p" ]; then
    echo "$f: id-keys=$(grep -c -e 'id:' "$p") objects-key=$(grep -c -e 'objects:' "$p") lines=$(wc -l < "$p")"
  fi
done
echo "=== wave2 references in src ==="
grep -rln -i -e 'wave2\|wave-2\|wave_2' src --include='*.ts' --include='*.tsx' --include='*.mjs' 2>/dev/null | grep -v worktrees | head -10
echo "=== wave2 worktree checkout content ==="
git -C .git/worktrees/fyd-wave2-clean status 2>/dev/null | head -3
ls .git/worktrees/ 2>/dev/null | head -20
echo "=== submitSignedEvent target ==="
grep -n -e 'submitSignedEvent' src/lib/ping/ping-object-reader.ts | head -5
sed -n '/async submitSignedEvent/,/^  }/p' src/lib/ping/ping-object-reader.ts | head -40
