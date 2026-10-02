#!/bin/bash
cd /home/nolan/projects/ping || exit 1
timeout 600 npx jest --config src/fyd/media/jest.config.cjs 2>&1 | tail -30
