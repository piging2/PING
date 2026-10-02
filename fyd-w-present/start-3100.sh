#!/bin/bash
# Restart the :3100 served surface (FYD sites) on the Pig.
# Launched with setsid so it survives SSH session exit.
set -u
cd /home/nolan/projects/ping

echo "[start-3100] stopping any existing :3100 listener"
fuser -k 3100/tcp 2>/dev/null || true
sleep 3

echo "[start-3100] starting next on :3100 with setsid"
setsid bash -c 'cd /home/nolan/projects/ping && exec npm start -- -p 3100' \
  >>/home/nolan/3100.log 2>&1 < /dev/null &
disown 2>/dev/null || true

echo "[start-3100] waiting for health"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    http://localhost:3100/sites/happy-place 2>/dev/null || true)
  if [ "$code" = "200" ]; then
    echo "[start-3100] healthy: happy-place 200"
    ss -tlnp 2>/dev/null | grep ':3100' | head -2
    exit 0
  fi
  sleep 3
done
echo "[start-3100] FAILED to become healthy; last log lines:"
tail -30 /home/nolan/3100.log
exit 1
