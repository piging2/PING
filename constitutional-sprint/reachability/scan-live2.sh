#!/bin/bash
C=/home/nolan/ping
B=/home/nolan/projects/ping-constitutional
echo "### (1) adapter jest config"
cat "$B/src/jest.config.cjs"
echo "### (2) CI-referenced files existence"
for f in test/replay_corpus_test.js test/verify_corpus.js test/generate_certificates.js test/compare_certificates.js test/fuzz_test.js test/verify_determinism.js tools/dependency-guard/dependency-validator.ts scripts/constitutional_query.py; do
  [ -e "$C/$f" ] && echo "OK $f" || echo "MISSING $f"
done
echo "### (3) next-server cwd mapping"
for p in 87920 3288 16302; do
  echo "pid $p cwd=$(readlink /proc/$p/cwd 2>/dev/null) cmd=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | head -c 120)"
done
echo "### (4) gateway /health route?"
grep -rl "health" "$C/gateway/" --include="*.js" 2>/dev/null | head -5
echo "### (5) unhealthy containers: health log tails (metadata)"
docker inspect ping-qdrant --format '{{json .State.Health}}' 2>/dev/null | head -c 800; echo
docker inspect ping-vault --format '{{json .State.Health}}' 2>/dev/null | head -c 800; echo
echo "### (6) var/ dir + gateway log tail"
ls "$C/var" 2>/dev/null | head -20
docker logs ping-gateway --tail 5 2>&1 | head -10
echo "### (7) what gateway image / compose defines ping-gateway"
docker inspect ping-gateway --format '{{.Config.Image}} started={{.State.StartedAt}}' 2>/dev/null
