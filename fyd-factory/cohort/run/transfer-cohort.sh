#!/bin/bash
# transfer-cohort.sh: stage raw HTML + runner onto the Pig (read-only wrt repo).
# Fast path per AGENTS.md: scp tarball to C:/Users/nolan/transfer, then wsl cp.
set -e
cd "$(dirname "$0")/.."
PIG_SCP="pigwsl:C:/Users/nolan/transfer/"
CFG="/home/hatch/.ssh/pig-config"

echo "=== packing raw ==="
tar -czf /tmp/cohort-raw.tar.gz -C raw .
RAW_SHA=$(sha256sum /tmp/cohort-raw.tar.gz | cut -d' ' -f1)
echo "raw sha: $RAW_SHA ($(du -h /tmp/cohort-raw.tar.gz | cut -f1))"

echo "=== ensuring transfer dir ==="
printf 'mkdir -p /mnt/c/Users/nolan/transfer\n' > /tmp/cohort-mkdir.sh
~/workspace/bin/wsl-run.sh /tmp/cohort-mkdir.sh 60

echo "=== scp tarball + runner + sites.json ==="
scp -F "$CFG" /tmp/cohort-raw.tar.gz "${PIG_SCP}cohort-raw.tar.gz"
scp -F "$CFG" run/cohort-run.mts "${PIG_SCP}cohort-run.mts"
scp -F "$CFG" run/sites.json "${PIG_SCP}cohort-sites.json"

echo "=== staging into WSL home + verify ==="
cat > /tmp/cohort-stage.sh <<EOF
set -e
mkdir -p /home/nolan/cohort-raw /home/nolan/cohort-out
cp /mnt/c/Users/nolan/transfer/cohort-raw.tar.gz /home/nolan/cohort-raw.tar.gz
echo "$RAW_SHA  /home/nolan/cohort-raw.tar.gz" | sha256sum -c -
rm -rf /home/nolan/cohort-raw && mkdir -p /home/nolan/cohort-raw
tar -xzf /home/nolan/cohort-raw.tar.gz -C /home/nolan/cohort-raw
cp /mnt/c/Users/nolan/transfer/cohort-run.mts /home/nolan/cohort-run.mts
cp /mnt/c/Users/nolan/transfer/cohort-sites.json /home/nolan/cohort-sites.json
ls /home/nolan/cohort-raw
echo "STAGED OK"
EOF
~/workspace/bin/wsl-run.sh /tmp/cohort-stage.sh 120
