#!/bin/bash
C=/home/nolan/ping
B=/home/nolan/projects/ping-constitutional
echo "### (1) require() targets in test/*.js and whether they resolve"
cd "$C/test" || exit 1
for f in *.test.js; do
  echo "--- $f"
  grep -oE "require\(['\"][^'\"]+['\"]\)" "$f" | sort -u | head -12
done
echo "### resolve check: do those relative targets exist?"
for t in ../gateway/adapter_compiler ../gateway/adapter_compiler_v2 ../ping-runtime/authorities/deterministic_id_authority ../runtime/replay/deterministic_replay_engine; do
  if [ -e "$C/test/$t" ] || [ -e "$C/test/$t.js" ] || [ -e "$C/test/$t/index.js" ]; then echo "OK: $t"; else echo "MISSING: $t"; fi
done
echo "### (2) runtime/replay and ping-runtime/authorities existence"
ls "$C/runtime/replay/" 2>/dev/null | head -15 || echo "NO runtime/replay"
ls "$C/ping-runtime/authorities/" 2>/dev/null | head -15 || echo "NO ping-runtime/authorities"
echo "### (3) adapter node_modules?"
[ -d "$B/node_modules" ] && echo "node_modules EXISTS ($(ls $B/node_modules | wc -l) entries)" || echo "NO node_modules"
[ -d "$C/node_modules" ] && echo "core node_modules EXISTS" || echo "NO core root node_modules"
echo "### (4) workflow triggers + jobs"
for wf in constitutional_ci.yml replay-integrity.yml constitutional-pipeline.yml constitutional-ops.yml freeze.yml; do
  echo "===== $wf ====="
  sed -n '1,40p' "$C/.github/workflows/$wf" 2>/dev/null | grep -E "on:|push|schedule|pull_request|cron|jobs:|runs-on|run:|name:" | head -12
done
echo "### (5) gh cli on Pig?"
which gh 2>/dev/null || echo "NO gh"
echo "### (6) workflow list full (names)"
grep -h "^name:" "$C/.github/workflows/"*.yml
