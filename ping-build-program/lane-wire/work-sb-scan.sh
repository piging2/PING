#!/bin/bash
# Wiring wave: inspect BCQ kit SB cases in the isolated worktree
KIT=/home/nolan/projects/ping-bcq-substrate/src/fyd/connectors/kit
echo "== files =="
ls "$KIT" "$KIT/__tests__" 2>/dev/null
echo "== SB- refs =="
grep -rln "SB-" "$KIT" 2>/dev/null
echo "== cap_/pingsec refs =="
grep -rn "cap_\|pingsec_1_" "$KIT" 2>/dev/null | head -30
echo "== secret/canary refs =="
grep -rn "canary\|Canary\|secret" "$KIT"/*.ts 2>/dev/null | grep -iv "secret broker\|secrets belong" | head -30
