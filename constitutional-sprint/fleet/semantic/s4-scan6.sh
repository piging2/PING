#!/bin/bash
CORE=/home/nolan/ping
echo "=== Dockerfile.projection/witness/replay existence anywhere ==="
find "$CORE" -maxdepth 2 -name 'Dockerfile*' -not -path '*/worktrees/*' -not -path '*/node_modules/*' 2>/dev/null
echo "=== git: were Dockerfile.projection/witness/replay ever present? ==="
cd "$CORE" && git log --oneline --diff-filter=D -- Dockerfile.projection Dockerfile.witness Dockerfile.replay 2>/dev/null | head -5
echo "=== root replay_worker.py main() ==="
grep -n -B2 -A30 'def main' "$CORE/replay_worker.py" | head -45
echo "=== root filesystem_worker.py main() ==="
grep -n -B2 -A30 'def main' "$CORE/filesystem_worker.py" | head -45
echo "=== .constitutional_snapshot.json tracked in git? ==="
cd "$CORE" && git ls-files | grep -e 'constitutional_snapshot' -e 'constitutional_events' | head -5; echo "(end)"
echo "=== ping-runtime/workers dir (JS canonical workers) ==="
ls "$CORE/ping-runtime/workers/" 2>/dev/null | head -20
echo "=== git log dates for root workers (latest 3) ==="
cd "$CORE" && git log -3 --format='%h %ad %s' --date=short -- replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py filesystem_worker.py constitutional_projection_worker.py simple_projection_worker.py projection_replay.py constitutional_runtime.py 2>/dev/null
echo "=== kernel/event_dispatcher.py register_event_handlers body ==="
sed -n '70,110p' "$CORE/kernel/event_dispatcher.py"
echo "=== simple_projection_worker bottom (how it ends / runs) ==="
tail -30 "$CORE/simple_projection_worker.py"
echo "=== any .service files mentioning these workers ==="
grep -rln -e 'replay_worker\|witness_worker\|constitutional_runtime' /etc/systemd/system/ ~/.config/systemd/user/ 2>/dev/null | head -5; echo "(end)"
