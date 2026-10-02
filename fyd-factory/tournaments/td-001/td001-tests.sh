#!/bin/bash
cd /home/nolan/projects/ping || exit 1
npx jest src/fyd/proceduralize/__tests__/generator.test.ts src/fyd/sitespec/__tests__/schemas.test.ts 2>&1 | tail -25
