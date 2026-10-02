#!/bin/bash
cd /home/nolan/projects/ping || exit 1
npx tsx --import ./src/fyd/lineage/register-css.mjs src/fyd/lineage/verify-tracer.ts 2>&1 | tail -30
