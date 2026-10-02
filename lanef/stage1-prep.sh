#!/bin/bash
# Lane F stage 1: hold releases/ aside (documented exclusion), verify clean tree, build snapshot.
set -u
R=/home/nolan/worktrees/constitutional-convergence
cd "$R"
echo "--- HEAD ---"
git rev-parse HEAD
echo "--- status before hold ---"
git status --porcelain
echo "--- holding releases/ (documented exclusion: release-record dir, not candidate source) ---"
find releases -type f | sort > /tmp/lanef/releases-filelist.txt
find releases -type f -exec md5sum {} \; | sort -k2 > /tmp/lanef/releases-md5-before.txt
wc -l /tmp/lanef/releases-filelist.txt
mv releases /tmp/lanef/releases-hold
echo "--- status after hold ---"
git status --porcelain
echo "(empty = clean tree)"
echo "--- snapshot from git archive a9cad2663 ---"
rm -rf /tmp/lanef/snap /tmp/lanef/cert-work
mkdir -p /tmp/lanef/snap /tmp/lanef/cert-work
git archive a9cad266353679a90e54b318100efb8153ea988e | tar -x -C /tmp/lanef/snap
echo "snapshot files: $(find /tmp/lanef/snap -type f | wc -l)"
echo "--- production npm ci in snapshot/gateway (mirrors Dockerfile.gateway) ---"
cd /tmp/lanef/snap/gateway
npm ci --only=production --no-audit --no-fund 2>&1 | tail -3
echo "STAGE1_DONE"
