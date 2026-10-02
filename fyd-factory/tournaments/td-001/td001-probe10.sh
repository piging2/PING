#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== strategies.ts ObjectFeed ====="
grep -n "ObjectFeed\|explore\|kind: \"all\"\|kind: 'all'" src/fyd/builder/strategies.ts | head -20
echo
echo "===== owner-intent.ts ObjectFeed ====="
grep -n "ObjectFeed\|explore" src/fyd/builder/owner-intent.ts | head -20
echo
echo "===== infer-strategy.ts SCHEMA_ROLES/ObjectFeed ====="
grep -n "ObjectFeed\|explore" src/fyd/builder/infer-strategy.ts | head -20
