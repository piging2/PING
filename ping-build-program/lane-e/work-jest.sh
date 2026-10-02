#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
npx jest src/fyd/sitespec/__tests__/schemas.test.ts src/fyd/components/__tests__/registry.test.ts src/fyd/components/__tests__/compose.test.ts 2>&1 | tail -25
