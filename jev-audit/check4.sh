D=/home/nolan/ping/worktrees/jev-surgical
echo "############ loop_gate.js"; cat "$D/ping-runtime/orchestration/execution/loop_gate.js"
echo "############ engine.js (relevant diff vs parent)"; git -C "$D" diff HEAD~1 HEAD -- ping-runtime/orchestration/execution/engine.js
