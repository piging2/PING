#!/bin/bash
cd /home/nolan/ping
echo "=== any completionHandler passed anywhere (incl tests/scripts) ==="
grep -rn "dispatchToAssignment" --include="*.js" . 2>/dev/null | grep -v node_modules | head
echo "=== legacy gateway/execution_authority.js: what it claimed (head) ==="
sed -n '1,40p' gateway/execution_authority.js
echo "=== is legacy gateway/execution_authority.js required anywhere? ==="
grep -rn "require.*execution_authority" --include="*.js" gateway ping-runtime runtime 2>/dev/null | grep -v node_modules | head
echo "=== JS identity authority: id scheme ==="
grep -nE "uuid|randomUUID|createHash|generate" gateway/identity_authority.js | head -8
echo "=== artifact store dir ==="
grep -n "STORE_DIR\s*=" ping-runtime/orchestration/execution/artifact_store.js | head -2
echo "=== mission_compiler emitGitDiff -> _executeMission: any dispatch? ==="
grep -n "_executeMission\|dispatch" ping-runtime/orchestration/execution/mission_compiler.js | head
