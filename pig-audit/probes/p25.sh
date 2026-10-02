#!/bin/bash
cd /home/nolan/ping
echo "=== worktree/workspace/tempdir in orca execution dir ==="
grep -rniE "worktree|cwd|tempdir|tmpdir|workspace" ping-runtime/orchestration/execution/*.js | grep -viE "contextWindow|ContextAuthority|workspaceAuthority|ai_workspace" | head -15
echo "=== timeout/retry/cancel in orca execution dir ==="
grep -rniE "timeout|retry|retries|cancel|abort" ping-runtime/orchestration/execution/*.js | grep -v ollama_provider | head -15
echo "=== python runtime calling gateway http (whole runtime dir) ==="
grep -rn "http://localhost\|http://127.0.0.1" --include="*.py" runtime/ | grep -viE "oauth|redirect|docs|w3|example" | head -10
echo "=== JS gateway calling python runtime http (whole gateway+ping-runtime) ==="
grep -rn "http://localhost:[0-9]*" --include="*.js" gateway ping-runtime | grep -v node_modules | grep -viE "11434|oauth|8080/connectors" | head -10
echo "=== python IdentityAuthority: id formats ==="
grep -nE "def |uuid|createHash|random" runtime/authorities/identity_authority.py | head -20
