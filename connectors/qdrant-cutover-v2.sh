#!/bin/bash
# qdrant healthcheck cutover v2 (fixes FL-20260924-204): adds VERIFIED-STOP gate.
# The old container must report State.Running=false AND no running container may
# hold port 6333 before the replacement is created. Rollback path unchanged.
set -u
OLD=ping-qdrant
BAK=ping-qdrant-prehcfix
ENVFILE=/tmp/qdrant-cutover.env
HC='timeout 5 bash -c '"'"'exec 3<>/dev/tcp/localhost/6333 && printf "GET /healthz HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && head -1 <&3 | grep -q "200 OK"'"'"' || exit 1'

echo "== snapshot old config =="
docker inspect $OLD --format '{{range .Config.Env}}{{println .}}{{end}}' > $ENVFILE
IMG=$(docker inspect $OLD --format '{{.Config.Image}}')
NET=$(docker inspect $OLD --format '{{.HostConfig.NetworkMode}}')
echo "img=$IMG net=$NET env_lines=$(wc -l < $ENVFILE)"

echo "== stop old =="
docker stop -t 20 $OLD >/dev/null
echo "== VERIFIED-STOP gate: wait for State.Running=false (max 40s) =="
STOPPED=0
for i in $(seq 1 8); do
  R=$(docker inspect $OLD --format '{{.State.Running}}' 2>/dev/null)
  echo "t=$((i*5))s running=$R"
  if [ "$R" = "false" ]; then STOPPED=1; break; fi
  sleep 5
done
[ "$STOPPED" = "1" ] || { echo "GATE_FAIL: old container still running; aborting, leaving it stopped-but-present"; exit 3; }

echo "== port-free gate: no running container may publish 6333 (max 30s) =="
FREE=0
for i in $(seq 1 6); do
  HOLDERS=$(docker ps --format '{{.Names}} {{.Ports}}' | grep -c '6333' || true)
  echo "t=$((i*5))s holders=$HOLDERS"
  if [ "$HOLDERS" = "0" ]; then FREE=1; break; fi
  sleep 5
done
[ "$FREE" = "1" ] || { echo "GATE_FAIL: port 6333 still held; restarting old container"; docker start $OLD >/dev/null; exit 4; }

echo "== rename old -> $BAK =="
docker rename $OLD $BAK

echo "== create new with fixed healthcheck =="
if ! docker run -d --name $OLD \
  --network $NET \
  -p 6333:6333 \
  -v ping_ping_qdrant:/qdrant/storage \
  --env-file $ENVFILE \
  --restart unless-stopped \
  --health-cmd "$HC" --health-interval 10s --health-timeout 5s --health-retries 5 --health-start-period 30s \
  $IMG ./entrypoint.sh; then
  echo "RUN_FAILED: rolling back"
  docker rename $BAK $OLD
  docker start $OLD >/dev/null
  rm -f $ENVFILE
  echo CUTOVER_ROLLBACK
  exit 5
fi

echo "== wait for healthy (max 120s) =="
for i in $(seq 1 24); do
  S=$(docker inspect $OLD --format '{{.State.Health.Status}}' 2>/dev/null || echo none)
  echo "t=$((i*5))s status=$S"
  if [ "$S" = "healthy" ]; then break; fi
  sleep 5
done

S=$(docker inspect $OLD --format '{{.State.Health.Status}}' 2>/dev/null || echo none)
if [ "$S" = "healthy" ]; then
  echo "== verify serving =="
  docker exec $OLD bash -c 'exec 3<>/dev/tcp/localhost/6333 && printf "GET /healthz HTTP/1.0\r\nHost: x\r\n\r\n" >&3 && head -1 <&3'
  echo "== SUCCESS: removing backup $BAK =="
  docker rm $BAK >/dev/null
  rm -f $ENVFILE
  echo CUTOVER_OK
else
  echo "== NOT HEALTHY after 120s: rolling back =="
  docker stop $OLD >/dev/null; docker rm $OLD >/dev/null
  docker rename $BAK $OLD
  docker start $OLD >/dev/null
  rm -f $ENVFILE
  echo CUTOVER_ROLLBACK
  exit 6
fi
