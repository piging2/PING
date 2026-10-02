#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== validator.ts:1-104 ==="
sed -n '1,104p' src/fyd/sitespec/validator.ts
