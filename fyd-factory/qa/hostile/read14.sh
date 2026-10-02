#!/bin/bash
cd /home/nolan/projects/ping
ls src/fyd/builder/__tests__/ src/fyd/components/__tests__/
echo "@@@@@ dogfood render test head @@@@@"
sed -n '1,80p' src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts
