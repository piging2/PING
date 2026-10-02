#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/eval-ask-battery.ts /home/nolan/fyd-preview-staging/eval-ask-battery.ts
rm -f /mnt/c/Users/nolan/transfer/eval-ask-battery.ts
cd /home/nolan/projects/ping
npx tsx /home/nolan/fyd-preview-staging/eval-ask-battery.ts > /home/nolan/fyd-preview-staging/eval-output.txt 2>&1
echo "EXIT: $?"
wc -l /home/nolan/fyd-preview-staging/eval-output.txt
