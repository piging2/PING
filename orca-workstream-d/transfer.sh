#!/bin/bash
# Byte-exact chunked transfer to the Pig (per AGENTS.md lessons):
# base64 chunks survive the ssh/cmd hop; sha256 verified both sides.
set -u
transfer() {
  local src="$1" dst="$2"
  local sha; sha=$(sha256sum "$src" | awk '{print $1}')
  ~/workspace/pig/pigwsl-run.sh "rm -f $dst" < /dev/null > /dev/null
  local b64; b64=$(base64 -w0 "$src")
  local n=${#b64} i=0 CH=2400
  while [ $i -lt $n ]; do
    ~/workspace/pig/pigwsl-run.sh "echo ${b64:$i:$CH} | base64 -d >> $dst" < /dev/null > /dev/null
    i=$((i+CH))
  done
  local rsha
  rsha=$(~/workspace/pig/pigwsl-run.sh "sha256sum $dst" < /dev/null | tr -d '\r' | awk '{print $1}' | tail -1)
  if [ "$sha" = "$rsha" ]; then
    echo "OK $dst ($sha)"
  else
    echo "MISMATCH $dst local=$sha remote=$rsha"
    return 1
  fi
}
transfer "$1" "$2"
