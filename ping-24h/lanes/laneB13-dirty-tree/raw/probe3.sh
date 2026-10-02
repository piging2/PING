cd /home/nolan/projects/ping || exit 1
echo "=== UNTRACKED-SOURCE-INVENTORY ==="
git ls-files --others --exclude-standard | grep -vE "^\.next\.|^public/(fyd-media|t1-media|images)/|__pycache__|\.tsbuildinfo$|\.pyc$" | while read -r f; do
  if [ -f "$f" ]; then sz=$(stat -c%s "$f"); mt=$(stat -c%y "$f" | cut -d. -f1); echo "$sz $mt $f"; fi
done | sort -k3
echo "=== STASH-FILES ==="
git stash show --name-only 'stash@{0}'
echo "=== STASH-SUBJECT ==="
git log -1 --format='%H %s %an %ad' 'stash@{0}'
echo "=== MTIME-SAMPLE ==="
for f in src/app/api/mc/dispatch/route.ts src/fyd/ask/context-compiler.ts src/app/api/mc/_lib/mc-dispatch-identity.ts src/lib/ping/digest.ts tools/fyd-journal-gateway/server.mjs; do
  [ -e "$f" ] && stat -c '%y %n' "$f"
done
echo "=== NEWEST-10-UNTRACKED ==="
git ls-files --others --exclude-standard | grep -vE "^\.next\.|^public/(fyd-media|t1-media|images)/|__pycache__|\.tsbuildinfo$|\.pyc$" | while read -r f; do [ -f "$f" ] && stat -c '%Y %y %n' "$f"; done | sort -rn | head -10
echo "=== DONE ==="
