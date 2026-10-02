#!/bin/bash
set -u
cd /home/nolan/projects/ping
npx jest --config src/fyd/boundary/jest.config.cjs -t "" 2>&1 | tail -80
