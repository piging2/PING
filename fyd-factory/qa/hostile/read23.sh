#!/bin/bash
cd /home/nolan/projects/ping
echo "@@@@@ view.ts imports @@@@@"
sed -n '1,45p' src/fyd/object/view.ts | grep -n "import\|from"
echo "@@@@@ object-projection imports @@@@@"
sed -n '1,40p' src/fyd/object/object-projection.ts | grep -n "import\|from"
echo "@@@@@ ObjectContactView / ObjectCapability types @@@@@"
sed -n '55,110p' src/fyd/object/types.ts
echo "@@@@@ PingObject fields type @@@@@"
grep -n "interface PingObject" -A 25 src/lib/ping/types.ts | head -35
