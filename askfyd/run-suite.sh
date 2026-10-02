#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
npx jest --config tests/ask-fyd/jest.config.cjs 2>&1 | tail -60
