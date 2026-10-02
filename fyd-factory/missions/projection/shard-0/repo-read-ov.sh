#!/bin/bash
cd /home/nolan/projects/ping
grep -n "interface ObjectView" src/fyd/object/types.ts
sed -n "$(grep -n 'interface ObjectView' src/fyd/object/types.ts | cut -d: -f1),+80p" src/fyd/object/types.ts
