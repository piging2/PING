#!/bin/bash
set -e
mkdir -p /mnt/c/Users/nolan/transfer
cp /mnt/c/Users/nolan/transfer/fyd-ask-page.tsx /home/nolan/fyd-preview-staging/ask/page.tsx
cp /mnt/c/Users/nolan/transfer/fyd-owner-console-page.tsx /home/nolan/fyd-preview-staging/owner-console/page.tsx
cp /mnt/c/Users/nolan/transfer/fyd-staging-readme.md /home/nolan/fyd-preview-staging/STAGING-README.md
sha256sum /home/nolan/fyd-preview-staging/ask/page.tsx /home/nolan/fyd-preview-staging/owner-console/page.tsx /home/nolan/fyd-preview-staging/STAGING-README.md
wc -l /home/nolan/fyd-preview-staging/ask/page.tsx /home/nolan/fyd-preview-staging/owner-console/page.tsx
rm -f /mnt/c/Users/nolan/transfer/fyd-ask-page.tsx /mnt/c/Users/nolan/transfer/fyd-owner-console-page.tsx /mnt/c/Users/nolan/transfer/fyd-staging-readme.md
find /home/nolan/fyd-preview-staging -type f | sort
