#!/bin/bash
CORE=/home/nolan/ping
echo "=== who starts workers/worker_runtime.py? ==="
cd "$CORE"
grep -rln --include='*.py' --include='*.js' --include='*.sh' --include='*.yml' --include='*.yaml' --include='compose*' -e 'worker_runtime' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' -e '/.git/' -e '^\./workers/worker_runtime\.py$' | head -15
echo "=== compose files: worker services? ==="
ls "$CORE"/docker-compose*.yml "$CORE"/compose*.yaml "$CORE"/compose*.yml 2>/dev/null
grep -n -e 'worker' "$CORE/docker-compose.yml" 2>/dev/null | head -20
grep -n -e 'worker' "$CORE/compose.yaml" 2>/dev/null | head -20
echo "=== gateway_runtime.js requires: constitutional_runtime? spawn? python? ==="
grep -n -e 'constitutional_runtime' -e 'spawn' -e 'python' "$CORE/gateway/bootstrap/gateway_runtime.js" | head -15
echo "=== root constitutional_runtime.py vs runtime/constitutional_runtime.py ==="
head -60 "$CORE/constitutional_runtime.py"
echo "-----"
head -40 "$CORE/runtime/constitutional_runtime.py" 2>/dev/null | head -40
echo "=== root constitutional_runtime.py main() ==="
grep -n -A25 'def main' "$CORE/constitutional_runtime.py" | head -50
echo "=== JS gateway /events/unprocessed handler: which table? ==="
sed -n '120,165p' "$CORE/gateway/routes/events.js"
echo "=== runtime/projection_worker/constitutional_projection_worker.py vs root: identical? ==="
if [ -f "$CORE/runtime/projection_worker/constitutional_projection_worker.py" ]; then
  sa=$(sha256sum "$CORE/runtime/projection_worker/constitutional_projection_worker.py" | cut -d' ' -f1)
  sb=$(sha256sum "$CORE/constitutional_projection_worker.py" | cut -d' ' -f1)
  [ "$sa" = "$sb" ] && echo IDENTICAL || { echo DIFFER; wc -l "$CORE/runtime/projection_worker/constitutional_projection_worker.py"; }
  ls "$CORE/runtime/projection_worker/"
fi
echo "=== workers/repository_client.py: backend ==="
head -c 1500 "$CORE/workers/repository_client.py"; echo
echo "=== workers/ variant main()s: do they have __main__? ==="
for f in claim_worker lineage_worker observation_worker replay_worker witness_worker projection_worker; do
  echo -n "$f: "; grep -c '__main__' "$CORE/workers/$f.py"
done
