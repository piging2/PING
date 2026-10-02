#!/bin/bash
cd /home/nolan/projects/ping
grep -n "function scanConflicts" -A 60 src/fyd/ask/concierge.ts | head -70
