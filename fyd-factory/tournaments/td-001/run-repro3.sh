#!/bin/bash
set -u
# Copy the transferred repro test into WSL home (disposable bridge), then run jest --runTestsByPath on the Pig.
mkdir -p /home/nolan/.fyd-td001
cp /mnt/c/Users/nolan/transfer/td001-repro.test.ts /home/nolan/.fyd-td001/repro.test.ts
sha256sum /home/nolan/.fyd-td001/repro.test.ts
# expected: d7e475372a90bdfedb829fc6ae366dd88b5f3aa19e6f7f8a3dd474feccc17ad8
cd /home/nolan/projects/ping
sed -i 's|/home/nolan/projects/ping/src|/home/nolan/projects/ping/src|g' /home/nolan/.fyd-td001/repro.test.ts
npx jest --runTestsByPath /home/nolan/.fyd-td001/repro.test.ts 2>&1 | tail -70
