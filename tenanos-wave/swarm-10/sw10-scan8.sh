#!/bin/bash
# SWARM-10 scan 8: knowledge promotion approval; capabilities endpoint now;
# mission runtime stuck states. Read-only.
R=/home/nolan/ping
echo "===== N1: promote (knowledge candidate -> knowledge) ====="
grep -rEn 'promote' "$R/gateway" "$R/ping-runtime" --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -25
echo "===== N2: capabilities endpoint / CapabilityAuthority.execute now ====="
grep -rEn "CapabilityAuthority.*execute|['\"]\/capabilities['\"]" "$R/gateway" --include='*.js' 2>/dev/null | grep -v node_modules | head -20
echo "===== N3: mission runtime files ====="
find "$R/gateway" "$R/ping-runtime" -iname '*mission*runtime*' -o -iname '*mission*scheduler*' 2>/dev/null | grep -v node_modules | head -10
echo "===== N4: mission stuck states (failed/blocked/dead) ====="
grep -rEn "mission_status.*=.*'(failed|blocked|dead|stuck)'|status.*'stalled'" "$R/gateway" --include='*.js' 2>/dev/null | grep -v node_modules | head -20
