#!/bin/bash
cd /home/nolan/projects/ping
npx jest --config src/fyd/customize/jest.config.cjs 2>&1 | grep -B2 -A 18 "●.*›" | head -80
