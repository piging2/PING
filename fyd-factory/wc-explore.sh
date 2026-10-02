cd /home/nolan/projects/ping
git branch --show-current
echo ---
find . -path ./node_modules -prune -o -iname '*fixture*' -print 2>/dev/null | grep -v node_modules | head -40
