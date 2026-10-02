#!/bin/bash
# Chunked base64 transfer to the Pig (avoids bridge heredoc/cmd.exe quoting faults).
set -euo pipefail
STAGE="$HOME/workspace/lanee-staging"
REMOTE_TMP=/tmp/lanee
BRIDGE="$HOME/workspace/pig/pigwsl-run.sh"

run_bridge() {
  "$BRIDGE" "$1" < /dev/null
}

transfer_file() {
  local src="$1" dest="$2"
  local base; base=$(basename "$dest")
  local b64; b64=$(base64 -w0 "$src")
  local md5; md5=$(md5sum "$src" | cut -d' ' -f1)
  local tmpdir; tmpdir=$(mktemp -d)
  printf '%s' "$b64" | fold -w 2800 > "$tmpdir/chunks"
  run_bridge "mkdir -p $REMOTE_TMP && rm -f $REMOTE_TMP/$base.b64"
  local i=0
  while IFS= read -r chunk || [ -n "$chunk" ]; do
    run_bridge "printf '%s' '$chunk' >> $REMOTE_TMP/$base.b64"
    i=$((i+1))
  done < "$tmpdir/chunks"
  local remote_md5
  remote_md5=$(run_bridge "base64 -d $REMOTE_TMP/$base.b64 > '$dest' && md5sum '$dest'" | grep -oE '^[a-f0-9]{32}' | head -1)
  rm -rf "$tmpdir"
  if [ "$remote_md5" != "$md5" ]; then
    echo "MD5 MISMATCH for $src: local=$md5 remote=$remote_md5" >&2
    return 1
  fi
  echo "OK $src -> $dest ($i chunks, md5 $md5)"
}

WT=/home/nolan/worktrees/constitutional-convergence
transfer_file "$STAGE/test_mount_wiring_contract_sec003_005.js" "$WT/tests/security/test_mount_wiring_contract_sec003_005.js"
transfer_file "$STAGE/test_sec003_005_auth.js" "$WT/tests/security/test_sec003_005_auth.js"
transfer_file "$STAGE/apply_fix.js" "$REMOTE_TMP/apply_fix.js"
