#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs 2>&1 | grep -B2 -A20 "●.*›" | head -40