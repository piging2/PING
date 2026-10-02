G=/home/nolan/ping/worktrees/gw-repair-build
echo "##### branch log (last 5):"; git -C "$G" log --oneline -5 2>&1
echo "##### merge-base with gate commit:"; git -C "$G" merge-base --is-ancestor d9a950a14 HEAD 2>&1 && echo "gate commit IS ancestor" || echo "gate commit NOT ancestor"
echo "##### route startAutonomousLoop in gw-repair-build:"; grep -n "startAutonomousLoop" "$G/gateway/routes/orchestration.js" | head -3
echo "##### collectWorkerOutput guard in gw-repair-build engine:"; grep -n "confidence !== null\|!== undefined &&" "$G/ping-runtime/orchestration/execution/engine.js" | head -3
echo "##### any 0.85 fabrications in gw-repair-build ping-runtime:"; grep -rn "confidence: 0\.85\|probability: 0\.85" "$G/ping-runtime" "$G/gateway/routes" --include=*.js 2>/dev/null | grep -v node_modules | head -8
