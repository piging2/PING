#!/bin/bash
C=/home/nolan/ping
B=/home/nolan/projects/ping-constitutional
echo "### ollama gateway modules"
for m in inference_witness model_authority ollama_adapter prompt_authority runtime_authority streaming_authority constitutional_authority_weighted technology_authority witness_generator; do
  [ -e "$C/gateway/$m.js" ] && echo "OK $m" || echo "MISSING $m"
done
echo "### constitutional_ci.yml test steps"
grep -E "run:|name:" "$C/.github/workflows/constitutional_ci.yml" | head -30
echo "### adapter: vitest dep? jest config anywhere?"
grep -o '"vitest"[^,]*' "$B/package.json" || echo "no vitest dep"
find "$B" -maxdepth 2 -name "jest.config*" -not -path "*/node_modules/*" 2>/dev/null || echo "no jest config at depth<=2"
echo "### core: how do certification tests run in CI (replay-integrity steps)?"
grep -E "run:|name:" "$C/.github/workflows/replay-integrity.yml" | head -20
echo "=== LIVE REACHABILITY (passive) ==="
echo "### ps: node/next/python/postgres/qdrant/docker"
ps aux | grep -E "node|next|python|postgres|qdrant|docker|gateway" | grep -v grep | awk '{print $2, $11, $12, $13}' | head -40
echo "### listening ports"
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | head -40
echo "### docker ps (passive)"
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' 2>/dev/null | head -20 || echo "docker not available"
