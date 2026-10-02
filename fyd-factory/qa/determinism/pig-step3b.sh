#!/bin/bash
set -e
cd /home/nolan/projects/ping || exit 1
sed -n '500,545p' src/fyd/sitespec/binding-verifier.ts
