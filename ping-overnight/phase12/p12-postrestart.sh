#!/bin/bash
# p12-postrestart.sh — L14 post-restart live event check.
# Resolves the muse-level-2 bearer transiently, emits one fresh authenticated
# event, and verifies the locally predicted deterministic ID matches.
cd /tmp/phase12 || exit 2
T1=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT api_key FROM exterior_agent_credentials WHERE agent_id = 'muse-level-2' AND is_active" | tr -d '[:space:]')
if [ -z "$T1" ]; then echo "FATAL: token resolution failed"; exit 2; fi
echo "token resolved: len=${#T1}"
export P12_Bearer="$T1"
export P12_BEARER2="$T1"
python3 /tmp/phase12/p12-postrestart.py
RC=$?
echo "postrestart exit=$RC"
exit $RC
