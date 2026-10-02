#!/bin/bash
cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs concierge 2>&1 | tail -80
