#!/bin/bash
set -u
cd /home/nolan/projects/ping
grep -n -B10 -A80 'function verifyPresentationBinding' src/fyd/sitespec/graph.ts | head -140
