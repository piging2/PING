#!/bin/bash
cd /home/nolan/projects/ping
grep -n "function buildGraphView" -A 60 src/fyd/ask/concierge.ts | head -75
