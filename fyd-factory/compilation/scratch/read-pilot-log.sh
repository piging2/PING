#!/bin/bash
H=/home/nolan/fyd-compile-harness
echo "=== pilot20.log ==="
cat "$H/pilot20.log"
echo "=== lock file ==="
ls -la "$H/queue-pilot20/"*.lock 2>/dev/null || echo "no lock"
