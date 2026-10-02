#!/bin/bash
# stage-cohort2.sh (runs ON the Pig): move transferred cohort-2 files into place.
set -e
mkdir -p /home/nolan/cohort2-raw /home/nolan/cohort2-out
rm -rf /home/nolan/cohort2-raw
mkdir -p /home/nolan/cohort2-raw /home/nolan/cohort2-out
rm -f /home/nolan/cohort2-out/*.json
tar xzf /mnt/c/Users/nolan/transfer/cohort2-raw.tar.gz -C /home/nolan/cohort2-raw --strip-components=1
cp /mnt/c/Users/nolan/transfer/cohort2-sites.json /home/nolan/cohort2-sites.json
cp /mnt/c/Users/nolan/transfer/cohort2-run.mts /home/nolan/cohort2-run.mts
cp /mnt/c/Users/nolan/transfer/run-cohort2-pig.sh /home/nolan/run-cohort2-pig.sh
chmod +x /home/nolan/run-cohort2-pig.sh
rm -f /mnt/c/Users/nolan/transfer/cohort2-raw.tar.gz /mnt/c/Users/nolan/transfer/cohort2-sites.json /mnt/c/Users/nolan/transfer/cohort2-run.mts /mnt/c/Users/nolan/transfer/run-cohort2-pig.sh /mnt/c/Users/nolan/transfer/stage-cohort2.sh
echo "staged site dirs: $(ls /home/nolan/cohort2-raw | wc -l)"
