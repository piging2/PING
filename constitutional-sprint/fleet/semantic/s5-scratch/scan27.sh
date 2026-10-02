#!/bin/bash
cd /home/nolan/ping
echo "=== mission_authority vs v2 imports ==="; grep -rn "require.*mission_authority\|mission_authority_v2" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v "mission_authority.js:\|mission_authority_v2.js:" | head -15
echo "=== mission_generator vs automatic ==="; grep -rn "require.*mission_generator\|automatic_mission_generator" --include='*.js' gateway/ ping-runtime/ 2>/dev/null | grep -v node_modules | grep -v test | head -10
echo "=== base_worker _emit ==="; grep -n "_emit\|namespace\|authoriz" ping-runtime/agents/base_worker.js | head -25
