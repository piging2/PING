#!/bin/bash
cd /home/nolan/projects/ping
grep -n "copy\|heading" src/fyd/customize/apply-layer.ts | head -20
echo "---intent.ts---"
grep -n "copy\|heading" src/fyd/customize/intent.ts | head -20
