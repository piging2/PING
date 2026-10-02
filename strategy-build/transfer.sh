#!/bin/bash
# Transfer strategy-layer files to the Pig via pigwsl-run.sh.
# Base64 chunking at 2000 chars/chunk, per-chunk size verification in the
# same bridge call, final md5 verification of the decoded file.
set -u
BRIDGE=~/workspace/pig/pigwsl-run.sh
WORK=~/workspace/strategy-build
CH=$WORK/chunks
rm -rf "$CH"; mkdir -p "$CH"

# NOTE: pigwsl-run.sh prints the remote command's raw stdout; the JSON
# envelope appears only in the tool result, not inside this script.
transfer() { # $1 local src, $2 remote dst
  local src="$1" dst="$2"
  local name; name=$(basename "$src")
  local dir="$CH/$name"; mkdir -p "$dir"
  base64 -w0 "$src" | split -b 2000 - "$dir/c_"
  local md5local; md5local=$(md5sum "$src" | cut -d' ' -f1)
  $BRIDGE "rm -f '$dst.b64'" < /dev/null > /dev/null
  local expected=0
  for c in "$dir"/c_*; do
    local payload; payload=$(cat "$c")
    local len=${#payload}
    expected=$((expected + len))
    local size
    size=$($BRIDGE "printf '%s' '$payload' >> '$dst.b64'; wc -c < '$dst.b64'" < /dev/null | tr -d ' \n')
    if [ "$size" != "$expected" ]; then
      echo "SIZE MISMATCH $name chunk $(basename "$c"): got [$size] want [$expected]"
      return 1
    fi
  done
  local rmd5
  rmd5=$($BRIDGE "base64 -d '$dst.b64' > '$dst' && rm '$dst.b64' && md5sum '$dst' | cut -d' ' -f1" < /dev/null | tr -d ' \n')
  if [ "$rmd5" != "$md5local" ]; then
    echo "MD5 MISMATCH $name: local $md5local remote $rmd5"
    return 1
  fi
  echo "OK $name md5=$rmd5"
}

transfer "$WORK/strategies.ts" /home/nolan/projects/ping/src/fyd/builder/strategies.ts
transfer "$WORK/infer-strategy.ts" /home/nolan/projects/ping/src/fyd/builder/infer-strategy.ts
transfer "$WORK/strategy-for-site.ts" /home/nolan/projects/ping/src/fyd/builder/strategy-for-site.ts
transfer "$WORK/site-vectors.ts" /home/nolan/projects/ping/src/fyd/builder/site-vectors.ts
transfer "$WORK/owner-intent.ts" /home/nolan/projects/ping/src/fyd/builder/owner-intent.ts
transfer "$WORK/strategies.test.ts" /home/nolan/projects/ping/src/fyd/builder/__tests__/strategies.test.ts
echo "TRANSFER DONE"
