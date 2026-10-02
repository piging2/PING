#!/bin/bash
cd /home/nolan/projects/ping
npx jest --config src/fyd/customize/jest.config.cjs zz-debug 2>&1 | grep -E "console.log|FACTS|COMPILED|TARGET|FIELD|RESOLVED|✓|✕" | head -30
