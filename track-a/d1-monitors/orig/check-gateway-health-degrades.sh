#!/usr/bin/env bash
# check: gateway-health-degrades — consecutive-failure counter; WARN after 2 non-healthy obs.
# State: consecutive_non_healthy in state.json. Healthy obs resets to 0 (no noise).
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
docker inspect -f '{{.State.Health.Status}} {{.State.Status}}' ping-gateway 2>/dev/null || echo MISSING
EOF
)
HEALTH="$(run_remote "$REMOTE")"

python3 - "$STATE_FILE" "$HEALTH" <<'PY' > /tmp/ghd.$$.out 2>/dev/null || true
import json, sys, datetime
sf, health = sys.argv[1], sys.argv[2].strip()
s = json.load(open(sf))
g = s["gateway_health_degrades"]
if health.startswith("healthy"):
    g["consecutive_non_healthy"] = 0
    g["last_status"] = health
    g["last_ok_at"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print("RESET", health)
else:
    g["consecutive_non_healthy"] = g.get("consecutive_non_healthy", 0) + 1
    g["last_status"] = health
    print("FAIL", g["consecutive_non_healthy"], health)
json.dump(s, open(sf, "w"), indent=2)
PY
RESULT="$(cat /tmp/ghd.$$.out 2>/dev/null)"; rm -f /tmp/ghd.$$.out
set -- $RESULT
if [ "$1" = "RESET" ]; then
  emit gateway-health-degrades OK "gateway healthy; consecutive-failure counter reset. status=$2"; exit 0
fi
N="$2"; STAT="${3:-unknown}"
if [ "$N" -ge 2 ]; then
  emit gateway-health-degrades WARN "gateway non-healthy for ${N} consecutive observations. status=${STAT}"; exit 1
fi
emit gateway-health-degrades OK "first non-healthy observation recorded (counter=1, need 2 for WARN). status=${STAT}"; exit 0
