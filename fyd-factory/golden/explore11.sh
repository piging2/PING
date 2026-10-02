#!/bin/bash
echo "=== website/ app routes ==="
find /home/nolan/projects/happy-place-platform/website/app -maxdepth 3 2>/dev/null | head -25
find /home/nolan/projects/happy-place-platform/website -maxdepth 2 -name "components" -o -maxdepth 2 -name "lib" 2>/dev/null | head
echo "=== happy-place route evolution (PING repo) ==="
cd /home/nolan/projects/ping
git log --format="%ad %h %s" --date=short -- src/app/sites/happy-place/ | head -10
echo "=== cleanup scratch ==="
rm -rf /home/nolan/fyd-golden-scratch /home/nolan/hpp-pig-route.html
ls /home/nolan/ | grep -i "fyd-golden\|hpp-pig" || echo "scratch clean"
