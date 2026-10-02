#!/bin/bash
cd /home/nolan/projects/ping
echo "=== conflict detection in pipeline ==="
grep -rn "conflict" src/fyd/proceduralize/*.ts | grep -i "export\|function\|interface" | head -10
echo "=== report fields ==="
grep -n "interface PipelineReport\|factsDiscovered" src/fyd/proceduralize/proceduralizer.ts | head -10
echo "=== how was validate-acq.mts run ==="
ls node_modules/.bin/ 2>/dev/null | grep -i "tsx\|ts-node" | head -3
echo "=== node version ==="
node --version
echo "=== AcquiredSource interface ==="
grep -n "interface AcquiredSource" src/fyd/proceduralize/proceduralizer.ts
sed -n "$(grep -n 'interface AcquiredSource' src/fyd/proceduralize/proceduralizer.ts | cut -d: -f1),+12p" src/fyd/proceduralize/proceduralizer.ts
echo "=== PipelineOutput ==="
grep -n "interface PipelineOutput" src/fyd/proceduralize/proceduralizer.ts
sed -n "$(grep -n 'interface PipelineOutput' src/fyd/proceduralize/proceduralizer.ts | cut -d: -f1),+12p" src/fyd/proceduralize/proceduralizer.ts
