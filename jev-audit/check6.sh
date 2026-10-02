D=/home/nolan/ping/worktrees/jev-surgical
echo "##### residual 0.85 in ping-runtime/gateway (excl tests):"; grep -rn "0\.85" "$D/ping-runtime" "$D/gateway/routes" --include=*.js | grep -v node_modules | head -20
echo "##### collectWorkerOutput confidence handling:"; grep -n "collectWorkerOutput" "$D/ping-runtime/orchestration/execution/engine.js" | head -3
echo "----- collectWorkerOutput body:"; awk '/collectWorkerOutput\(workerId, missionId, output\) \{/,/^\s{2}\}$/' "$D/ping-runtime/orchestration/execution/engine.js" | head -60
