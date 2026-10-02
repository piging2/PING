#!/bin/bash
# Restart FYD demo gateway (127.0.0.1:18199) so it loads the regenerated
# event_registry.json (now including FYD_SITE_OVERLAY). DEMO gateway only;
# the 8080 deployment gateway is untouched.
set -u
cd /home/nolan/ping/gateway || exit 1
# Stop the old demo gateway (pid 89541 at last check; match by PORT env to be safe)
for pid in $(pgrep -f "node server.js"); do
  if tr '\0' '\n' < /proc/$pid/environ 2>/dev/null | grep -q "^PORT=18199$"; then
    echo "stopping old demo gateway pid $pid"
    kill "$pid" 2>/dev/null
  fi
done
sleep 3
# Extract postgres password from the ping-test-pg container env (never printed)
PGPW=$(docker inspect ping-test-pg --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')
if [ -z "$PGPW" ]; then echo "FATAL: no PGPW"; exit 1; fi
setsid nohup env PORT=18199 POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55433 POSTGRES_DB=ping-fyd-demo POSTGRES_USER=postgres POSTGRES_PASSWORD="$PGPW" node server.js > /tmp/ping-fyd-gateway-18199.log 2>&1 < /dev/null &
echo "relaunched, waiting for readiness"
for i in $(seq 1 25); do
  if curl -s -o /dev/null --max-time 2 http://127.0.0.1:18199/identities; then
    echo "READY after ${i}x2s"
    break
  fi
  sleep 2
done
grep -o "EventValidator.*Loaded [0-9]* event types" /tmp/ping-fyd-gateway-18199.log | tail -1
curl -s -o /dev/null -w "identities:%{http_code}\n" --max-time 5 http://127.0.0.1:18199/identities
