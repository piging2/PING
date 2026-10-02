#!/bin/bash
# SWARM-10 scan 5: sizes of key escalation-related files. Read-only.
R=/home/nolan/ping
wc -l \
  "$R/gateway/approval_authority.js" \
  "$R/gateway/mission_execution_graph.js" \
  "$R/gateway/node_registry.js" \
  "$R/gateway/checkpoint_authority.js" \
  "$R/gateway/capability_authority.js" \
  "$R/gateway/automatic_mission_generator.js" \
  "$R/gateway/self_improvement_loop.js" \
  "$R/gateway/routes/mission_control.js" \
  "$R/gateway/routes/orchestration.js" \
  "$R/gateway/routes/governance.js" \
  "$R/ping-runtime/orchestration/merge_gate.js" \
  "$R/ping-runtime/orchestration/merge_queue.js" \
  "$R/ping-runtime/orchestration/execution/consensus_engine.js" \
  "$R/ping-runtime/orchestration/execution/engine.js" \
  2>/dev/null
echo "===== search: 8 categories / decision inbox / human intent (docs+code) ====="
grep -rEni 'consequential categor|human.?intent|decision.?inbox' "$R/gateway" "$R/ping-runtime" "$R/docs" 2>/dev/null | grep -v node_modules | head -30
