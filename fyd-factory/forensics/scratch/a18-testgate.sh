#!/bin/bash
cd /home/nolan/projects/ping
echo "===== TEST-GATE.md ====="; head -60 src/fyd/TEST-GATE.md
echo; echo "===== api/fyd route files ====="; find src/app/api/fyd -name "route.ts" | sort
