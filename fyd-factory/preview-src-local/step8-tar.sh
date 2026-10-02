#!/bin/bash
# STEP 8: remove remaining .orig2 backup, tar worktree (excluding .git, node_modules, .next),
# write tarball to Pig-side staging dir, print size + sha256.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
STAGE=/home/nolan/fyd-preview-stage
mkdir -p "$STAGE"
rm -f "$WT/src/fyd/customize/owner-proposal.ts.orig2"
echo "remaining orig-ish: $(find "$WT" \( -name "*.orig" -o -name "*.orig2" -o -name "*.bak" -o -name "*.rej" \) -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l)"
TAR="$STAGE/fyd-preview-wt.tar.gz"
tar -czf "$TAR" \
  --exclude=.git --exclude=node_modules --exclude=.next \
  --exclude="*.orig" --exclude="*.orig2" --exclude="*.bak" --exclude="*.rej" \
  -C /home/nolan fyd-preview-wt
ls -lh "$TAR"
sha256sum "$TAR"
echo "tar contents (top level):"
tar -tzf "$TAR" | cut -d/ -f1-2 | sort -u | head -20
