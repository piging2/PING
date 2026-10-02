cd /home/nolan/projects/ping || exit 1
for s in coppersmith-plumbing happy-place; do
  echo "===== $s ====="
  find src/app/sites/$s -maxdepth 3 | head -40
  echo "--- jsons ---"
  find src/app/sites/$s -name "*.json" | head -20
done
echo '=== corpus / fixtures elsewhere ==='
find . -path ./node_modules -prune -o -maxdepth 5 -type d -iname "*fixture*" -print 2>/dev/null | head
find . -path ./node_modules -prune -o -maxdepth 5 -type d -iname "*corpus*" -print 2>/dev/null | head
