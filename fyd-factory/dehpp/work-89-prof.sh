#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "TRADES_PROFILE\|KNOWLEDGE_PROFILE" -A 30 src/fyd/archetypes/profiles.ts | grep -e "tokenOverrides" -A 12 | head -40
