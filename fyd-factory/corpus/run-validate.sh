#!/bin/bash
set -e
mkdir -p /home/nolan/fyd-acq-fixtures
cp /mnt/c/Users/nolan/transfer/fyd-acq-xfer.tar.gz /home/nolan/fyd-acq-fixtures/xfer.tar.gz
echo "b3a5e93bb6ed50c7d2120b071382c709fbfa717cd20b6f6bddc3c8d36c400b76  /home/nolan/fyd-acq-fixtures/xfer.tar.gz" | sha256sum -c -
cd /home/nolan/fyd-acq-fixtures
tar -xzf xfer.tar.gz
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-acq-fixtures/validate-acq.mts > /home/nolan/fyd-acq-fixtures/results.json
cat /home/nolan/fyd-acq-fixtures/results.json
