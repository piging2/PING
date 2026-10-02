#!/bin/bash
# Start the EDGE-PORT proof surface on :3101 (Pig).
# Worktree: /home/nolan/build-edge-port, branch fyd/edge-port.
# Mirrors /home/nolan/start-3100.sh: setsid detach, stdio to a log file.
# NEVER touches :3100, the keep-awake holder, or any other tree.
set -u

export NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1

cd /home/nolan/build-edge-port

echo "[start-3101] verifying .next/BUILD_ID"
if [ ! -f .next/BUILD_ID ]; then
  echo "[start-3101] REFUSING: no .next/BUILD_ID; run 'npx next build' first"
  exit 1
fi
cat .next/BUILD_ID

echo "[start-3101] stopping any existing :3101 listener"
fuser -k 3101/tcp 2>/dev/null || true
sleep 3

echo "[start-3101] starting next on :3101 with setsid"
setsid bash -c 'cd /home/nolan/build-edge-port && exec npm start -- -p 3101' \
  >>/home/nolan/3101-edge.log 2>&1 < /dev/null &
disown 2>/dev/null || true

echo "[start-3101] waiting for health"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    http://localhost:3101/sites/happy-place 2>/dev/null || true)
  if [ "$code" = "200" ]; then
    echo "[start-3101] healthy: happy-place 200"
    ss -tlnp 2>/dev/null | grep ':3101' | head -2
    exit 0
  fi
  sleep 3
done
echo "[start-3101] FAILED to become healthy; last log lines:"
tail -30 /home/nolan/3101-edge.log
exit 1
