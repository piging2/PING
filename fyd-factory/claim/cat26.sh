#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "edit_copy" src/fyd/customize/*.ts | grep -v __tests__ | head
echo "---apply edit_copy---"
grep -n "edit_copy" -A 25 src/fyd/customize/apply-layer.ts | head -50
