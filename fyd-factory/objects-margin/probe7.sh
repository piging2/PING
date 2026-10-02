#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### sites/_shared #####"
find src/app/sites/_shared -type f | head -20
echo "##### happy-place page (60) #####"
ls src/app/sites/happy-place/
sed -n '1,60p' src/app/sites/happy-place/page.tsx 2>/dev/null
