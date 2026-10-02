#!/bin/bash
set -e
mkdir -p /mnt/c/Users/nolan/transfer
cp /mnt/c/Users/nolan/transfer/harness.ts /home/nolan/fyd-projection-harness/harness.ts
sha256sum /home/nolan/fyd-projection-harness/harness.ts
# init git repo for patch validation
cd /home/nolan/fyd-projection-harness
if [ ! -d .git ]; then git init -q; git add harness.ts; git -c user.email=factory@local -c user.name=factory commit -qm "harness v1"; fi
git status --short
