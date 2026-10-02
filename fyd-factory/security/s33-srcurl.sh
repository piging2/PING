#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== DisplayMedia.sourceUrl render usage ==="
grep -rn '\.sourceUrl' src/fyd/components src/fyd/object src/fyd/ui --include='*.tsx' | grep -v __tests__ | head -10
echo "=== net/safe-fetch scheme gate ==="
grep -n -i 'protocol\|scheme\|https\?:' src/fyd/net/safe-fetch.ts | head -15
