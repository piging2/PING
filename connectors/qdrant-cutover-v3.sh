#!/bin/bash
# qdrant healthcheck cutover v3 (fixes FL-20260924-204):
# - Omits the never-effective `-p 6333:6333` (host port owned by brain-qdrant;
#   `docker ps`/`docker port` proved ping-qdrant never actually published it).
# - Reattaches the container to ping_ping_internal (found network-detached).
# - Installs the fixed bash /dev/tcp /healthz probe (no curl in image).
# Reversible: old container renamed to backup until new proves healthy.
set -u
OLD=ping-qdrant
BAK=ping-qdrant-prehcfix
ENVFILE=/tmp/qdrant-cutover.env
NET=ping_ping_internal
HC='timeout 5 bash -c '"'"'exec 3<>/dev/tcp/localhost/6333 && printf "GET /healthz HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && head -1 <&3 | grep -q "200 OK"'"'"' || exit 1'

echo "== snapshot old config =="
docker inspect $OLD --format '{{range .Config.Env}}{{println .}}{{end}}' > $ENVFILE
IMG=$(docker inspect $OLD --format '{{.Config.Image}}')
echo "img=$IMG env_lines=$(wc -l < $ENVFILE)"

echo "== stop old (verified) =="
docker stop -t 20 $OLD >/dev/null
for i in $(seq 1 8); do
  R=$(docker inspect $OLD --format '{{.State.Running}}' 2>/dev/null)
  [ "$R" = "false" ] && break
  sleep 5
done
R=$(docker inspect $OLD --format '{{.State.Running}}')
[ "$R" = "false" ] || { echo "GATE_FAIL: still running"; exit 3; }
echo "stopped verified"

echo "== rename old -> $BAK =="
docker rename $OLD $BAK

echo "== create new: no host-port bind (brain-qdrant owns 6333), fixed probe =="
if ! docker run -d --name $OLD \
  --network $NET \
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
  echo "== verify serving + network attached =="
  docker exec $OLD bash -c 'exec 3<>/dev/tcp/localhost/6333 && printf "GET /healthz HTTP/1.0\r\nHost: x\r\n\r\n" >&3 && head -1 <&3'
  docker inspect $OLD --format 'networks: {{range $k, $v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}'
  echo "== name resolution from a peer on $NET =="
  docker exec ping-redis getent hosts ping-qdrant || docker exec ping-redis nslookup ping-qdrant 2>/dev/null | head -3 || echo "WARN: no DNS check tool in redis"
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
