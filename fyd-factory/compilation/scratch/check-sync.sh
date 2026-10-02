#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd "$H/runner"
for f in lib.ts job-worker.ts queue-runner.ts enqueue.js rollup.js chain-proof.ts; do echo "$f: $(sha256sum $f | cut -c1-12)"; done
