#!/bin/bash
# LANE-ARCH probe I: remaining constraint evidence + dirty mtimes + misc exports (read-only)
set -u
REPO=/home/nolan/projects/ping
cd "$REPO"
echo "=== em dash chars in src/fyd user-facing copy (sample) ==="
grep -rn "—" src/fyd --include='*.tsx' --include='*.ts' | grep -v __tests__ | head -8
echo "(count:)"; grep -rn "—" src/fyd --include='*.tsx' --include='*.ts' | grep -v __tests__ | wc -l
echo "=== AllObjects / object-explorer references ==="
grep -rni "AllObjects\|object-explorer\|object explorer" src/fyd src/app --include='*.ts' --include='*.tsx' | grep -v __tests__ | head -10
echo "=== DIRTY FILES with mtime, grouped ==="
git status --porcelain | awk '{print $2}' | while read f; do
  if [ -e "$f" ]; then mt=$(stat -c '%y' "$f" | cut -d. -f1); else mt="DELETED?"; fi
  echo "$f :: $mt"
done
echo "=== src/components/fyd/ listing ==="
ls -R src/components/fyd 2>/dev/null | head -30
echo "=== ask lane missing files exports ==="
for f in src/fyd/ask/visitor-answer.ts src/fyd/ask/site-patch.ts src/fyd/ask/circle-actions.ts src/fyd/ask/site-spec.ts src/fyd/components/ask-fyd-widget.tsx; do
  echo "--- $f ($(wc -l < "$f") lines)"
  grep -E '^export (class|function|const|type|interface)' "$f" | head -12
done
echo "=== strategies.ts CompositionPolicy/SiteStrategy head ==="
sed -n '1,80p' src/fyd/builder/strategies.ts
echo "=== planner.ts strategy usage ==="
grep -n "strategy\|Strategy" src/fyd/builder/planner.ts | head -20
