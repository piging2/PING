#!/bin/bash
CORE=/home/nolan/ping
echo "=== TAILS of root workers (__main__ bodies) ==="
for f in replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py filesystem_worker.py constitutional_projection_worker.py projection_replay.py; do
  p="$CORE/$f"
  echo "--- $f (tail from __main__) ---"
  awk '/if __name__/{found=1} found{print NR": "$0}' "$p"
done
echo
echo "=== who references constitutional_runtime (any ext) ==="
cd "$CORE"
grep -rln --include='*.py' --include='*.js' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.json' -e 'constitutional_runtime' . 2>/dev/null | grep -v -e '^\./worktrees' -e 'node_modules' -e '/.git/' -e '^\./constitutional_runtime\.py$' | head -20
echo
echo "=== kernel/event_dispatcher.py: worker refs ==="
grep -n -e 'worker' "$CORE/kernel/event_dispatcher.py" | head -30
echo "=== does kernel/event_dispatcher.py import ROOT workers or workers/ variants? ==="
grep -n -e 'import' "$CORE/kernel/event_dispatcher.py" | head -20
echo
echo "=== gateway bootstrap: does it spawn python workers? ==="
grep -rn -e 'python' --include='gateway_runtime.js' "$CORE/gateway/bootstrap/" 2>/dev/null | head -10
grep -rln -e 'child_process.*spawn.*py\b\|spawn.*worker' "$CORE/gateway/" 2>/dev/null | grep -v node_modules | head -10
echo
echo "=== JS gateway: /events/unprocessed /events/processed /events/failed routes? ==="
grep -rn -e 'unprocessed\|events/processed\|events/failed' "$CORE/gateway/routes/" "$CORE/gateway/api_controller.js" 2>/dev/null | head -10
echo
echo "=== CREATE TABLE for python 'events' vs ping_events in migrations ==="
grep -rln --include='*.sql' -e 'CREATE TABLE' "$CORE" 2>/dev/null | grep -v -e worktrees -e node_modules | head -10
echo "--- which tables does the JS gateway create? ---"
grep -rn -e 'CREATE TABLE' "$CORE/gateway/" "$CORE/ping-runtime/events/" 2>/dev/null | grep -v node_modules | head -10
echo
echo "=== runtime/projection_worker/rebuild_certification.py:115 context ==="
sed -n '95,140p' "$CORE/runtime/projection_worker/rebuild_certification.py"
echo
echo "=== core AGENTS.md mention of filesystem_worker ==="
grep -n -B2 -A4 'filesystem_worker' "$CORE/AGENTS.md" 2>/dev/null | head -20
echo
echo "=== systemd timers: what do they run? ==="
systemctl cat ping-mirror-sync.service 2>/dev/null | head -15
systemctl cat ping-oci-queue.service 2>/dev/null | head -15
