#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
ls src/fyd/proceduralize/__tests__/ 2>/dev/null
ls src/fyd/proceduralize/__fixtures__/ 2>/dev/null
echo ""
grep -n "makeObject\|function.*graph\|const.*Graph" src/fyd/proceduralize/__tests__/generator.test.ts 2>/dev/null | head -10
