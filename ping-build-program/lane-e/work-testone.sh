#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
npx vitest run src/fyd/sitespec/__tests__/schemas.test.ts 2>&1 | head -60
