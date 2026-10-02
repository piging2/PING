#!/bin/bash
cd /home/nolan/projects/ping
echo "=== sourceType values emitted in proceduralize ==="
grep -rhoE 'sourceType: "[a-z-]+"' src/fyd/proceduralize/*.ts | sort | uniq -c
echo "=== body-text extraction? ==="
grep -rln "bodyText\|body-text\|innerText\|textContent" src/fyd/proceduralize/*.ts | head
echo "=== feed-parser usage (service cards) ==="
grep -n "service-card\|serviceCard\|feed-parser" src/fyd/proceduralize/proceduralizer.ts | head -8
