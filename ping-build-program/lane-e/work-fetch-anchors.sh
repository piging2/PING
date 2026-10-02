#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
sed -n '228,250p' src/fyd/sitespec/schemas.ts
echo "########## line numbers of key anchors ##########"
grep -n "Derivation 2\|const SCHEMA_COMPONENTS\|export function eligibleComponents\|^}" src/fyd/sitespec/schemas.ts | sed -n '1,20p'
