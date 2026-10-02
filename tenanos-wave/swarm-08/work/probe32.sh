#!/bin/bash
# swarm-08 probe 32: systemAuthority.getSystemState provenance (read-only)
set -u
echo "### find getSystemState ==="
timeout 60 grep -rln "async getSystemState\|getSystemState()" /home/nolan/ping/ping-runtime /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -5
