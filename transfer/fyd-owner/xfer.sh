#!/bin/bash
# Chunked file transfer to the Pig: base64, ~2000-char chunks, 3 chunks per
# bridge call (stays under the cmd.exe command-line limit), md5-verified.
set -u
BRIDGE=~/workspace/pig/pigwsl-run.sh
REPO=/home/nolan/projects/ping

xfer() {
  local src="$1" dest="$2"
  local md5 b64 n i chunk script attempt ok
  md5=$(md5sum "$src" | cut -d' ' -f1)
  b64=$(base64 -w0 "$src")
  n=${#b64}
  # run_bridge: retry a bridge call up to 4 times (transient proxy drops)
  run_bridge() {
    attempt=1
    while [ $attempt -le 4 ]; do
      if "$BRIDGE" "$1" < /dev/null > /dev/null 2>/tmp/xfer.err; then
        return 0
      fi
      sleep 3
      attempt=$((attempt + 1))
    done
    echo "bridge call failed 4x: $(head -c 200 /tmp/xfer.err)"
    return 1
  }
  run_bridge 'rm -f /tmp/xfer.b64' || return 1
  i=0
  while [ $i -lt $n ]; do
    script=""
    # 2 chunks of 2000 chars per bridge call: 3 chunks puts the total
    # ssh command over cmd.exe's 8191-char limit.
    for k in 1 2; do
      if [ $i -ge $n ]; then break; fi
      chunk=${b64:$i:2000}
      script="${script}printf '%s' '$chunk' >> /tmp/xfer.b64; "
      i=$((i + 2000))
    done
    run_bridge "$script" || return 1
  done
  local remote_md5
  for attempt in 1 2 3 4; do
    remote_md5=$("$BRIDGE" "base64 -d /tmp/xfer.b64 > '$dest' && md5sum '$dest' | cut -d' ' -f1 && rm -f /tmp/xfer.b64" < /dev/null 2>/dev/null) && [ -n "$remote_md5" ] && break
    sleep 3
  done
  if [ "$remote_md5" = "$md5" ]; then
    echo "OK   $dest md5=$md5"
  else
    echo "FAIL $dest local=$md5 remote=$remote_md5"
    return 1
  fi
}

xfer ~/workspace/transfer/fyd-owner/owner-events.ts "$REPO/src/fyd/object/owner-events.ts" || exit 1
xfer ~/workspace/transfer/fyd-owner/owner-store.ts "$REPO/src/fyd/object/owner-store.ts" || exit 1
xfer ~/workspace/transfer/fyd-owner/__tests__/owner-events.test.ts "$REPO/src/fyd/object/__tests__/owner-events.test.ts" || exit 1
xfer ~/workspace/transfer/fyd-owner/capability.ts "$REPO/src/fyd/owner-mode/capability.ts" || exit 1
xfer ~/workspace/transfer/fyd-owner/demo-chain.ts "$REPO/src/fyd/owner-mode/demo-chain.ts" || exit 1
xfer ~/workspace/transfer/fyd-owner/overrides-route.ts "$REPO/src/app/api/fyd/objects/[objectId]/overrides/route.ts" || exit 1
echo "ALL TRANSFERS VERIFIED"
