#!/bin/bash
set -u
cd /home/nolan/projects/ping
grep -A30 '"jest"' package.json | head -40
ls src/fyd/sitespec/jest.config.cjs && head -20 src/fyd/sitespec/jest.config.cjs
