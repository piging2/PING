#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/eval-supplement.ts /home/nolan/fyd-preview-staging/eval-supplement.ts
rm -f /mnt/c/Users/nolan/transfer/eval-supplement.ts
cd /home/nolan/projects/ping
npx tsx /home/nolan/fyd-preview-staging/eval-supplement.ts
