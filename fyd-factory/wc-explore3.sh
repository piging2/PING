cd /home/nolan/projects/ping
echo "=== factory dirs ==="
find . -path ./node_modules -prune -o -type d -iname '*factory*' -print 2>/dev/null | head
echo "=== batch mentions ==="
grep -rl -i 'batch-a\|batch-b\|batch-c\|redacted fixture' --include='*.ts' --include='*.json' --include='*.md' . 2>/dev/null | grep -v node_modules | head
echo "=== tenant graph head ==="
head -80 src/fyd/data/fyd-tenant-graph.ts
