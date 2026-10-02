#!/bin/bash
B=/home/nolan/projects/ping-constitutional
C=/home/nolan/ping
emit() { printf '=====FILE:%s=====\n' "$1"; cat "$1"; printf '\n'; }
emit "$B/src/fyd/object/__tests__/owner-events.test.ts"
emit "$B/src/fyd/identity/__tests__/principal.test.ts"
emit "$B/src/fyd/resolve/spike/__tests__/resolve.test.ts"
emit "$B/src/fyd/refresh/__tests__/website-observe.test.ts"
emit "$B/src/fyd/ui/__tests__/capability-runtime.test.ts"
emit "$B/src/fyd/tenant/__tests__/d-worker.test.ts"
emit "$B/src/fyd/claim/__tests__/machine.test.ts"
emit "$B/src/fyd/claim/__tests__/seam.test.ts"
echo "=====DONE-ADAPTER====="
emit "$C/test_event_ingestion.py"
emit "$C/tests/test_runtime_authority_boundaries.py"
emit "$C/tests/test_constitutional_planner.py"
echo "=====DONE-PY====="
head -80 "$C/test/constitutional_replay.test.js"
printf '=====FILE:run_constitutional_pipeline.js(head)=====\n'
head -60 "$C/test/run_constitutional_pipeline.js"
printf '=====FILE:_test_pipeline.py(head)=====\n'
head -60 "$C/_test_pipeline.py"
