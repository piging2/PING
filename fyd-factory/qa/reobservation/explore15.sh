#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
sed -n '25,60p' src/fyd/sitespec/types.ts
