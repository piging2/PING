#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== preview dir ====="
ls src/fyd/preview/
echo "===== preview/pipeline.ts head ====="
head -120 src/fyd/preview/pipeline.ts
echo "===== app/sites ====="
ls src/app/sites/ 2>/dev/null
echo "===== sites/coppersmith-plumbing/page.tsx ====="
head -100 src/app/sites/coppersmith-plumbing/page.tsx
