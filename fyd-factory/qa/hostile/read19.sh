#!/bin/bash
cd /home/nolan/projects/ping
grep -n "website\|phone\|email" src/fyd/object/view.ts | head -30
echo "@@@@@ contact view construction @@@@@"
sed -n '240,330p' src/fyd/object/view.ts
