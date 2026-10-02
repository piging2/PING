#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | grep -B3 -A18 "●.*›" | head -70