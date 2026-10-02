#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json -e "
import { computePipelineCodeVersion, shortVersion, HARNESS_VERSION } from '$H/runner/lib.ts';
const v = computePipelineCodeVersion();
console.log('HARNESS_VERSION=' + HARNESS_VERSION);
console.log('pipeline_code_version=' + v);
console.log('short=' + shortVersion(v));
console.log('length_ok=' + (v.length === 64));
" 2>&1 | tail -6
