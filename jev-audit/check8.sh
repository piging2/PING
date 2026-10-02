D=/home/nolan/ping/worktrees/jev-surgical
sed -n '1,60p' "$D/ping-runtime/jev/typed_decision.js"
echo "....."; sed -n '120,200p' "$D/ping-runtime/jev/typed_decision.js"
echo "##### consumers of TypedDecision:"; grep -rn "typed_decision\|TypedDecision" "$D/ping-runtime" "$D/gateway" --include=*.js | grep -v node_modules | grep -v "jev/typed_decision.js" | head -15
