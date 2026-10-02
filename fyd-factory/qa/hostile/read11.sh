#!/bin/bash
cd /home/nolan/projects/ping
sed -n '1,120p' "src/app/build/[siteId]/page.tsx"
echo "@@@@@ object page metadata @@@@@"
sed -n '30,80p' "src/app/o/[objectId]/page.tsx"
