#!/bin/bash
cd /home/nolan/projects/ping || exit 1
grep -n "export function resolveBoundField" -A 30 src/fyd/sitespec/graph.ts | head -45
echo "===== binding classifications ====="
grep -n "BindingClassification" src/fyd/sitespec/graph.ts | head -5
