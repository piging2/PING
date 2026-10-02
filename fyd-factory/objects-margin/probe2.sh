#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "##### portal-host search #####"
find src -type f -iname "*portal-host*" -o -type d -iname "*portal*" 2>/dev/null | grep -v node_modules | head
echo "##### src/app/o route #####"
ls src/app/o/ 2>/dev/null; find src/app -path "*o/*" -name "page.tsx" 2>/dev/null | head
echo "##### src/fyd/object tree #####"
find src/fyd/object -maxdepth 2 -type f 2>/dev/null | sort | head -40
echo "##### object APIs #####"
find src/app/api -path "*object*" 2>/dev/null | head -20
find src/app/api/fyd -maxdepth 1 2>/dev/null | head -20
