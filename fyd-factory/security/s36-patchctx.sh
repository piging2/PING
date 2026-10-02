#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## boundary/jest.config.cjs (with line numbers) ##########"
cat -A src/fyd/boundary/jest.config.cjs | sed -n '1,20p' | head -20
echo "########## select.ts toDisplayMedia (lines 76-100) ##########"
sed -n '70,100p' src/fyd/media/select.ts
echo "########## select.ts imports (lines 1-25) ##########"
sed -n '20,30p' src/fyd/media/select.ts
