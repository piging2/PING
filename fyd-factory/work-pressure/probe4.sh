cd /home/nolan/projects/ping || exit 1
find src -maxdepth 3 -type d -iname "*site*" 2>/dev/null
echo '=== fixture dirs with coppersmith ==='
find . -path ./node_modules -prune -o -maxdepth 4 -type d -iname "*coppersmith*" -print 2>/dev/null | head
echo '=== happy-place dirs ==='
find . -path ./node_modules -prune -o -maxdepth 4 -type d -iname "*happy*" -print 2>/dev/null | head
