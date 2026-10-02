#!/bin/bash
# p12-run.sh — Phase 12 main driver runner.
# Resolves bearer tokens transiently from exterior_agent_credentials.
# Token VALUES are never echoed; only lengths are printed.
cd /tmp/phase12 || exit 2
T1=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT api_key FROM exterior_agent_credentials WHERE agent_id = 'muse-level-2' AND is_active" | tr -d '[:space:]')
T2=$(docker exec ping-postgres psql -U ping -d crx_runtime -tAc "SELECT api_key FROM exterior_agent_credentials WHERE agent_id = 'muse' AND is_active" | tr -d '[:space:]')
if [ -z "$T1" ] || [ -z "$T2" ]; then echo "FATAL: token resolution failed"; exit 2; fi
echo "tokens resolved: T1(muse-level-2) len=${#T1} T2(muse) len=${#T2}"
export P12_BEARER="$T1"
export P12_BEARER2="$T2"
python3 /tmp/phase12/p12-driver.py > /tmp/phase12/driver.out 2>&1
DRC=$?
tail -5 /tmp/phase12/driver.out
echo "driver exit=$DRC"
exit $DRC
