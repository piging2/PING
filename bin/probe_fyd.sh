#!/bin/bash
R=/home/nolan/projects/ping-fyd-converged
echo "=== fact-name emission in extractStructuredData (lines 600-760) ==="
sed -n '600,760p' $R/src/fyd/proceduralize/structured-data.ts | grep -n 'name:\|factName\|snake\|openingHours\|telephone' | head -30
echo "=== project() lines referencing phone/address/hours ==="
grep -n '"phone"\|"address"\|"hours"\|"openingHours"\|openingHours\|telephone' $R/src/fyd/proceduralize/proceduralizer.ts | head -30
echo "=== who calls runExtractionPipeline / how findings built in live-loop (UNDERSTAND->RESOLVE call sites) ==="
grep -n 'parseRich\|runExtractionPipeline\|mergeStructuredExtractions\|scopeFields\|project(' $R/src/fyd/acquisition/live-loop.ts | head -30
echo "=== where :3100 server runs: process list ==="
ps aux | grep -E 'next-server|node .*3100|next.*dev' | grep -v grep | head -10
