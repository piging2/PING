#!/bin/bash
cd /home/nolan/ping
echo "=== all .execute( call sites ==="
grep -rn "\.execute(" --include="*.js" ping-runtime gateway | grep -v node_modules | head -20
echo "=== executor: assignments ==="
grep -rn "executor" --include="*.js" ping-runtime gateway | grep -v node_modules | grep -v "^Binary" | head -30
echo "=== ollama_provider.js OS/HTTP primitives ==="
grep -nE "child_process|spawn|execSync|http|fetch|axios|11434|localhost" ping-runtime/orchestration/execution/ollama_provider.js | head -30
