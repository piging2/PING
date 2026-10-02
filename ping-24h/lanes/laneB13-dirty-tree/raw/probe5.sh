cd /home/nolan/projects/ping || exit 1
git ls-files --others --exclude-standard | grep -vE "^\.next\.|^public/(fyd-media|t1-media|images)/|__pycache__|\.tsbuildinfo$|\.pyc$|^=586$|^nul$" | sort | while read -r f; do
  [ -f "$f" ] || continue
  git diff --no-index -- /dev/null -- "$f" || true
done
echo "=== UNTRACKED-DIFF-END ==="
