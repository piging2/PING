#!/bin/bash
cp /mnt/c/Users/nolan/transfer/concierge.patch /tmp/concierge.patch
cd /home/nolan/projects/ping
git apply --check /tmp/concierge.patch && echo "PATCH APPLIES CLEAN"
# show the exact context lines the patch expects, to confirm fidelity
sed -n '348,356p' src/fyd/ask/concierge.ts
