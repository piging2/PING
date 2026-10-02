#!/bin/bash
# SWARM-10 pull 1: dump key escalation-related files with delimiters. Read-only.
R=/home/nolan/ping
echo "===== WHERE IS capability authority now? ====="
find "$R/gateway" "$R/ping-runtime" "$R/runtime" -iname '*capabilit*' 2>/dev/null | grep -v node_modules | head -20
for f in \
  gateway/approval_authority.js \
  gateway/mission_execution_graph.js \
  gateway/node_registry.js \
  ping-runtime/orchestration/merge_gate.js \
  ping-runtime/orchestration/merge_queue.js \
  ping-runtime/orchestration/execution/consensus_engine.js \
  ; do
  echo ""
  echo "############ FILE: $f ############"
  cat "$R/$f"
done
