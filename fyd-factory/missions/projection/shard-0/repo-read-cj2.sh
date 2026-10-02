#!/bin/bash
cd /home/nolan/projects/ping
sed -n '890,975p' src/fyd/ask/concierge.ts
echo "########## ping types ##########"
grep -n "PingObject\|PingRelationship" src/lib/ping/types.ts | head -10
