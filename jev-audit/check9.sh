D=/home/nolan/ping/worktrees/jev-surgical
echo "##### test_jev_preflight:"; node "$D/gateway/test_jev_preflight.js" 2>&1 | tail -25
echo "##### test_jev_shadow:"; node "$D/gateway/test_jev_shadow.js" 2>&1 | tail -12
echo "##### gw-repair-build jev lane files:"; for f in ping-runtime/orchestration/execution/loop_gate.js ping-runtime/jev/decision_unit.js ping-runtime/orchestration/execution/engine.js gateway/routes/orchestration.js; do echo -n "$f: "; [ -f "/home/nolan/ping/worktrees/gw-repair-build/$f" ] && echo EXISTS || echo MISSING; done
echo "##### gate commit in gw-repair-build?"; git -C /home/nolan/ping/worktrees/gw-repair-build log --oneline --all --grep="P0 gate closure" 2>&1 | head -3
echo "##### allowSyntheticLoop in gw-repair-build:"; grep -rn "allowSyntheticLoop\|assertAutonomousLoopAllowed" /home/nolan/ping/worktrees/gw-repair-build --include=*.js 2>/dev/null | grep -v node_modules | head -10
echo "##### 0.85 in gw-repair-build engine.js:"; grep -n "0\.85" /home/nolan/ping/worktrees/gw-repair-build/ping-runtime/orchestration/execution/engine.js 2>/dev/null | head -5
