#!/bin/bash
cd /home/nolan/projects/ping || exit 1
ls node_modules > /dev/null 2>&1 && echo "node_modules: present" || echo "node_modules: MISSING"
node --version
npx jest --config src/fyd/media/jest.config.cjs --listTests 2>&1 | head -20
