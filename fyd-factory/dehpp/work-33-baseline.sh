#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
node_modules/.bin/jest --config src/fyd/builder/jest.config.cjs 2>&1 | tail -15
