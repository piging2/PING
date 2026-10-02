#!/bin/bash
cd /home/nolan/ping
echo "=== _emit / namespace in canonical_workers ==="; grep -n "_emit\|namespace" ping-runtime/workers/canonical_workers.js | head -20
echo "=== automatic_mission_generator started by ==="; grep -rn "AutomaticMissionGenerator\|automaticMissionGenerator\|new (require.*automatic" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | head -8
echo "=== activities/index importers ==="; grep -rn "activities/index\|require.*activities" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v "activities/index.js" | head -8
