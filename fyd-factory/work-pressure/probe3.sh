cd /home/nolan/projects/ping || exit 1
for s in coppersmith-plumbing happy-place; do
  echo "===== $s ====="
  find src/fyd/sites/$s -maxdepth 2 | head -30
done
echo '=== _shared ==='
find src/fyd/sites/_shared -maxdepth 2 | head -30
