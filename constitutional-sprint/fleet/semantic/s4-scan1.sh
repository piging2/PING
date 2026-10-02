#!/bin/bash
CORE=/home/nolan/ping
echo "=== ROOT WORKERS: size + first-40-lines ==="
for f in replay_worker.py witness_worker.py lineage_worker.py observation_worker.py claim_worker.py filesystem_worker.py constitutional_projection_worker.py simple_projection_worker.py projection_replay.py; do
  p="$CORE/$f"
  echo "--- $f ---"
  if [ -f "$p" ]; then
    wc -l "$p"; head -c 2000 "$p"; echo
  else
    echo "ABSENT"
  fi
done
echo "=== FIND projection_replay.py anywhere in core ==="
find "$CORE" -maxdepth 4 -name 'projection_replay*' -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/worktrees/*' 2>/dev/null
echo "=== sha256: root vs workers/ duplicates ==="
for n in claim_worker lineage_worker observation_worker replay_worker witness_worker; do
  a="$CORE/$n.py"; b="$CORE/workers/$n.py"
  if [ -f "$a" ] && [ -f "$b" ]; then
    sa=$(sha256sum "$a" | cut -d' ' -f1); sb=$(sha256sum "$b" | cut -d' ' -f1)
    if [ "$sa" = "$sb" ]; then echo "$n: IDENTICAL"; else echo "$n: DIFFER (root $(wc -l < $a) lines vs workers $(wc -l < $b) lines)"; fi
  else
    echo "$n: root_exists=$([ -f $a ] && echo y || echo n) workers_exists=$([ -f $b ] && echo y || echo n)"
  fi
done
echo "=== workers/ dir listing ==="
ls -la "$CORE/workers/"
echo "=== worktrees git status (are worktrees dirty?) ==="
cd "$CORE" && git worktree list 2>/dev/null | head -20
