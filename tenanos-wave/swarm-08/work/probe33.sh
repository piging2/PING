#!/bin/bash
# swarm-08 probe 33: getSystemState body (read-only)
set -u
awk '/async getSystemState/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/runtime/system_authority.js | head -70
