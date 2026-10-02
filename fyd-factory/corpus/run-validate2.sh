#!/bin/bash
set -e
sed -i 's#/home/nolan/fyd-acq-fixtures"#/home/nolan/fyd-acq-fixtures/fixtures"#' /home/nolan/fyd-acq-fixtures/validate-acq.mts
grep 'const FIX' /home/nolan/fyd-acq-fixtures/validate-acq.mts
cd /home/nolan/projects/ping
./node_modules/.bin/tsx /home/nolan/fyd-acq-fixtures/validate-acq.mts > /home/nolan/fyd-acq-fixtures/results.json
cat /home/nolan/fyd-acq-fixtures/results.json
