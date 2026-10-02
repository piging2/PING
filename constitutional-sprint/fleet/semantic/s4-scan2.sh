#!/bin/bash
CORE=/home/nolan/ping
echo "=== __main__ blocks in root workers ==="
for f in replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py filesystem_worker.py constitutional_projection_worker.py simple_projection_worker.py projection_replay.py; do
  p="$CORE/$f"
  echo "--- $f ---"
  grep -n '__main__' "$p" || echo "no __main__"
done
echo
echo "=== references to each root worker filename across CORE (excl worktrees/node_modules/.git) ==="
cd "$CORE"
for n in replay_worker witness_worker lineage_worker observation_worker claim_worker filesystem_worker constitutional_projection_worker simple_projection_worker projection_replay; do
  echo "--- refs to $n ---"
  grep -rln --include='*.py' --include='*.js' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.json' --include='*.md' -e "$n" . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' -e '/.git/' -e '^\./'$n'\.py$' | head -20
done
echo
echo "=== who imports the worker classes (import.*Worker) ==="
grep -rn --include='*.py' -e 'import.*\(ReplayWorker\|WitnessWorker\|LineageWorker\|ObservationWorker\|ClaimWorker\|FilesystemWorker\|ConstitutionalProjectionWorker\|ProjectionReplay\)' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' | grep -v -e '^\./\(replay_worker\|witness_worker\|lineage_worker\|observation_worker\|claim_worker\|filesystem_worker\|constitutional_projection_worker\|simple_projection_worker\|projection_replay\)\.py' | head -30
echo
echo "=== subprocess/child_process invocations of workers ==="
grep -rn --include='*.py' --include='*.js' --include='*.sh' -e '\(replay\|witness\|lineage\|observation\|claim\|filesystem\|constitutional_projection\|simple_projection\|projection_replay\)_worker\.py' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' | grep -v '^\./.*_worker\.py:' | head -20
echo
echo "=== worker_runtime.py head ==="
head -c 3000 "$CORE/workers/worker_runtime.py"; echo
echo "=== workers/projection_worker.py head ==="
head -c 2000 "$CORE/workers/projection_worker.py"; echo
echo
echo "=== imports used: does runtime/configuration exist? runtime/authorities? ==="
ls "$CORE/runtime/configuration.py" "$CORE/runtime/config/" 2>&1 | head -5
ls "$CORE/runtime/authorities/embedding_authority.py" "$CORE/runtime/authorities/execution_authority.py" "$CORE/runtime/config/configuration_authority.py" 2>&1 | head -5
echo
echo "=== filesystem_worker artifacts on disk ==="
ls -la "$CORE/.constitutional_snapshot.json" "$CORE/.constitutional_events.sql" 2>&1
echo "=== cron / pm2 / systemd / compose references to these workers ==="
crontab -l 2>/dev/null | grep -i worker | head -5
ls ~/.config/systemd/user/ 2>/dev/null | head -10
grep -rln --include='docker-compose*' -e '_worker' "$CORE" 2>/dev/null | grep -v worktrees | head -5
echo "=== any .pm2 / ecosystem configs mentioning workers ==="
find "$CORE" -maxdepth 2 -name 'ecosystem*' -o -maxdepth 2 -name '.pm2' 2>/dev/null | grep -v worktrees | head -5
echo "=== git log: last commits touching root workers ==="
cd "$CORE" && git log --oneline -5 -- replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py filesystem_worker.py constitutional_projection_worker.py simple_projection_worker.py projection_replay.py 2>/dev/null
echo "=== git log: workers/ dir ==="
cd "$CORE" && git log --oneline -5 -- workers/ 2>/dev/null
