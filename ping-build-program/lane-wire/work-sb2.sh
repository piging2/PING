#!/bin/bash
KIT=/home/nolan/projects/ping-bcq-substrate/src/fyd/connectors/kit
echo "== secret-handle discipline section =="
sed -n '610,720p' "$KIT/contract-kit.ts"
echo "== CapabilityHandle type =="
sed -n '160,200p' "$KIT/types.ts"
echo "== broker section of harness =="
sed -n '205,250p' "$KIT/harness.ts"
