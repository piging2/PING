#!/bin/bash
set -u
cd /home/nolan/projects/ping
grep -n -B5 -A60 'export function resolveBoundField' src/fyd/sitespec/graph.ts | head -110
