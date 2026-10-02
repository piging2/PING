#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
npx jest src/fyd/sitespec/__tests__/schemas.test.ts 2>&1 | head -40
