#!/bin/bash
cd /home/nolan/projects/ping || exit 1
CSS=src/fyd/sitespec/__tests__/css-register.cjs
./node_modules/.bin/tsx --import "./$CSS" /home/hatch/workspace/fyd-factory/qa/determinism/gen-inputs.mts
