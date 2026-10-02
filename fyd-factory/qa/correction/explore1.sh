cd /home/nolan/projects/ping
git branch --show-current
git status --porcelain | head -20
echo "=== src/fyd/customize ==="
ls -R src/fyd/customize 2>/dev/null | head -40
echo "=== src/fyd/owner-mode ==="
ls -R src/fyd/owner-mode 2>/dev/null | head -40
echo "=== fixture search ==="
find . -path ./node_modules -prune -o -iname "*coppersmith*" -print 2>/dev/null | grep -v node_modules | head -20
