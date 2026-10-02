#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/eval-hostile-live.ts /home/nolan/fyd-preview-staging/eval-hostile-live.ts
rm -f /mnt/c/Users/nolan/transfer/eval-hostile-live.ts
cd /home/nolan/projects/ping
npx tsx /home/nolan/fyd-preview-staging/eval-hostile-live.ts
