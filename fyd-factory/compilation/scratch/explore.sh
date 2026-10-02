#!/bin/bash
cd /home/nolan/projects/ping && git rev-parse HEAD && git status --porcelain | wc -l
ls src/fyd | head -40
echo ---
ls src/fyd/builder src/fyd/sitespec 2>/dev/null
