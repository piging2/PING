#!/bin/bash
cd /home/nolan/projects/ping
echo "=== droppedRelationships in proceduralizer ==="
grep -rn "droppedRelationships" src/fyd/proceduralize/*.ts | grep -v __tests__ | head -10
echo "=== unsupported kinds ==="
grep -rn "unmapped-property\|site-chrome-node\|malformed-block" src/fyd/proceduralize/*.ts | grep -v __tests__ | head -12
