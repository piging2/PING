D=/home/nolan/ping/worktrees/jev-surgical
echo "##### route diff (orchestration.js)"; git -C "$D" diff HEAD~1 HEAD -- gateway/routes/orchestration.js | head -120
echo "##### all allowSyntheticLoop refs:"; grep -rn "allowSyntheticLoop" "$D" --include=*.js -l | head; echo "---"; grep -rn "allowSyntheticLoop" "$D" --include=*.js | grep -v node_modules | grep -v test_ | head -20
echo "##### startAutonomousLoop callers:"; grep -rn "startAutonomousLoop" "$D" --include=*.js | grep -v node_modules | head -20
