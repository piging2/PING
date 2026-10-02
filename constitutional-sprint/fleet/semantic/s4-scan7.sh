#!/bin/bash
CORE=/home/nolan/ping
echo "=== do all root worker mains use sample/test events? ==="
cd "$CORE"
for f in replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py constitutional_projection_worker.py; do
  echo -n "$f: "
  grep -c -e 'sample_event' -e 'test-doc' "$f" | tr '\n' ' '
  grep -n 'def main' -A6 "$f" | grep -e 'print(' | head -2
done
echo
echo "=== projection_replay.py main() ==="
grep -n -B2 -A20 'def main' "$CORE/projection_replay.py" | head -35
echo "=== who calls rebuild_certification / runtime.constitutional_runtime? ==="
grep -rln --include='*.py' --include='*.js' --include='*.sh' -e 'rebuild_certification' -e 'runtime\.constitutional_runtime\|from runtime import constitutional_runtime' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' -e '/.git/' -e 'runtime/projection_worker/rebuild_certification.py' | head -10
echo "=== who imports projection_replay / simple_projection_worker? ==="
grep -rln --include='*.py' -e 'projection_replay\|simple_projection_worker' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' | head -10
echo "=== runtime/constitutional_runtime.py: rest of driver (loop + mark processed) ==="
sed -n '40,120p' "$CORE/runtime/constitutional_runtime.py"
