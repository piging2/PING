#!/bin/bash
cd /home/nolan/projects/ping
grep -n "function claimsConflicts" -A 70 src/fyd/ask/concierge.ts | head -90
