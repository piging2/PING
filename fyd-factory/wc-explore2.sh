cd /home/nolan/projects/ping
echo "=== happy-place / coppersmith mentions ==="
grep -rl --include='*.ts' --include='*.json' -i 'happy-place\|coppersmith' src/fyd 2>/dev/null | head -20
echo "=== corpus dirs ==="
find . -path ./node_modules -prune -o -type d -iname '*corpus*' -print 2>/dev/null | head
echo "=== object tests fixtures ==="
ls src/fyd/object/__tests__/fixtures
