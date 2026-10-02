#!/bin/bash
set -e
cp /mnt/c/Users/nolan/transfer/fyd-owner-console-page.tsx /home/nolan/fyd-preview-staging/owner-console/page.tsx
cp /mnt/c/Users/nolan/transfer/fyd-staging-readme.md /home/nolan/fyd-preview-staging/STAGING-README.md
rm -f /mnt/c/Users/nolan/transfer/fyd-owner-console-page.tsx /mnt/c/Users/nolan/transfer/fyd-staging-readme.md
sha256sum /home/nolan/fyd-preview-staging/ask/page.tsx /home/nolan/fyd-preview-staging/owner-console/page.tsx /home/nolan/fyd-preview-staging/STAGING-README.md
find /home/nolan/fyd-preview-staging -type f | sort
