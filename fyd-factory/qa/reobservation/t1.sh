#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo 'import { generateSiteSpec } from "@/fyd/proceduralize/generator"; console.log("import-ok", typeof generateSiteSpec);' | timeout 90 ./node_modules/.bin/tsx /dev/stdin 2>&1 | head -25
