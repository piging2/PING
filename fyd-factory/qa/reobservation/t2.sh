#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
timeout 90 ./node_modules/.bin/tsx --eval 'import { generateSiteSpec } from "@/fyd/proceduralize/generator"; console.log("import-ok", typeof generateSiteSpec);' 2>&1 | head -8
