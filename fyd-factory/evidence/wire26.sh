#!/bin/bash
cd /home/nolan/projects/ping || exit 1
# Fix the +++ headers to use repo paths instead of /tmp paths
sed -i 's|+++ b/tmp/site-client-new.tsx|+++ b/src/app/sites/_shared/site-client.tsx|' /mnt/c/Users/nolan/transfer/sites-wire-p1-footer-provenance.patch
sed -i 's|+++ b/tmp/renderer-new.tsx|+++ b/src/fyd/components/renderer.tsx|' /mnt/c/Users/nolan/transfer/sites-wire-p2-rights-inferred.patch
# Also ensure --- headers are correct
sed -i 's|--- a/tmp/site-client-new.tsx|--- a/src/app/sites/_shared/site-client.tsx|' /mnt/c/Users/nolan/transfer/sites-wire-p1-footer-provenance.patch
sed -i 's|--- a/tmp/renderer-new.tsx|--- a/src/fyd/components/renderer.tsx|' /mnt/c/Users/nolan/transfer/sites-wire-p2-rights-inferred.patch
echo "headers fixed"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p1-footer-provenance.patch && echo "P-1 PASS" || echo "P-1 FAIL"
git apply --check /mnt/c/Users/nolan/transfer/sites-wire-p2-rights-inferred.patch && echo "P-2 PASS" || echo "P-2 FAIL"
