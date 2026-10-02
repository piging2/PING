#!/bin/bash
# SWARM-10 pull 2: engine.js, mission generator, self-improvement loop, routes, capability-authority.ts
R=/home/nolan/ping
for f in \
  ping-runtime/orchestration/execution/engine.js \
  gateway/automatic_mission_generator.js \
  gateway/self_improvement_loop.js \
  gateway/routes/orchestration.js \
  gateway/routes/governance.js \
  runtime/kernel/capabilities/capability-authority.ts \
  ; do
  echo ""
  echo "############ FILE: $f ############"
  cat "$R/$f"
done
echo ""
echo "############ mission_control.js head (681 lines, first 120) ############"
head -120 "$R/gateway/routes/mission_control.js"
