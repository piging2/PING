#!/bin/bash
cd /home/nolan/projects/ping
echo "@@@@@ renderer exports @@@@@"
grep -n "^export" src/fyd/components/renderer.tsx | head -30
echo "@@@@@ capabilities @@@@@"
ls src/fyd/capabilities/
echo "@@@@@ media select head @@@@@"
sed -n '1,80p' src/fyd/media/select.ts
