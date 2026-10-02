#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
npx jest src/fyd/compose src/fyd/copy src/fyd/proceduralize/__tests__/composition.test.ts 2>&1 | tail -25