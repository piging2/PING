#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## projection-boundary.test.ts ##########"
cat src/fyd/components/__tests__/projection-boundary.test.ts
echo "########## render.test.ts (head 120) ##########"
head -120 src/fyd/components/__tests__/render.test.ts
