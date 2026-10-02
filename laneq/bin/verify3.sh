cd /home/nolan/projects/ping
sed -n '588,600p' src/lib/ping/ask-composer.ts
echo "=== tsc full ==="
npx tsc --noEmit 2>&1 | head -30
echo "tsc exit: $?"
