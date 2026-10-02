#!/bin/bash
cd /home/nolan/projects/ping
echo "===== happy-place fixture: business object provenance ====="; python3 -c "
import json, re
src = open('src/fyd/proceduralize/__fixtures__/happy-place-graph.ts').read()
print('file bytes:', len(src))
" 2>/dev/null || echo "no python3 or file missing"
grep -n "provenance" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head -20
echo; echo "===== claimKind in fixtures ====="; grep -c "claimKind" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
