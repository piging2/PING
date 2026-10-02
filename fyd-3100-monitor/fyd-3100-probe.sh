#!/usr/bin/env bash
# fyd-3100-probe.sh -- separate-domain health probe for FYD on :3100.
#
# DESIGN (see DESIGN.md): report HOST, NETWORK, and FYD as SEPARATE
# failure domains so an incident can say HOST UP / NETWORK UP / FYD DOWN
# instead of blaming the wrong layer. FYD itself is probed on :3100 via
# its own /api/fyd/healthz (liveness) and /api/fyd/readyz (readiness);
# the probe never infers FYD health from Pig host health.
#
# Two modes:
#   --local    run ON the Pig (WSL): probes 127.0.0.1:3100 directly.
#              Host reachability is trivially true here; the value is in
#              separating FYD liveness/readiness from serving pages.
#   --remote   run from the operator VM: checks Pig reachability over SSH
#              (HOST), TCP connect to the Tailscale :3100 (NETWORK), then
#              FYD's own health endpoints (FYD).
#
# The probe NEVER restarts :3100. Restart is a separate, gated, human
# action via /home/nolan/start-3100.sh (non-PTY ssh, stdio on files),
# followed by the env-flag verification the house protocol requires.
#
# Exit codes: 0 = all probed domains green; 1 = FYD down/not ready;
#             2 = HOST or NETWORK down (FYD verdict impossible).
set -u

MODE="${1:---local}"
TS_IP="${FYD_PIG_TAILSCALE_IP:-100.79.154.43}"
SSH_CFG="${PIG_SSH_CONFIG:-/home/hatch/.ssh/pig-config}"
TIMEOUT=10

BASE_URL="http://127.0.0.1:3100"
HOST_LABEL="pig-local"
if [ "$MODE" = "--remote" ]; then
  BASE_URL="http://${TS_IP}:3100"
  HOST_LABEL="pig-tailscale"
fi

report() { # domain status detail
  printf '{"domain":"%s","status":"%s","detail":"%s","at":"%s"}\n' \
    "$1" "$2" "$3" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

curl_code() { # url -> http code or UNREACHABLE
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -m "$TIMEOUT" "$1" 2>/dev/null)" || code=""
  if [ -z "$code" ] || [ "$code" = "000" ]; then echo "UNREACHABLE"; else echo "$code"; fi
}

OVERALL=0

if [ "$MODE" = "--remote" ]; then
  # ---- HOST: can we reach the Pig at all? ----
  if ssh -F "$SSH_CFG" -o ConnectTimeout=8 -o BatchMode=yes pigwsl 'wsl -- echo ok' >/dev/null 2>&1; then
    report "host" "up" "$HOST_LABEL ssh ok"
  else
    report "host" "down" "$HOST_LABEL ssh unreachable"
    report "network" "unknown" "host unreachable; network verdict impossible"
    report "fyd" "unknown" "host unreachable; fyd verdict impossible"
    exit 2
  fi
  # ---- NETWORK: does the Tailscale :3100 TCP port answer? ----
  if timeout 8 bash -c "</dev/tcp/${TS_IP}/3100" 2>/dev/null; then
    report "network" "up" "tcp ${TS_IP}:3100 connect ok"
  else
    report "network" "down" "tcp ${TS_IP}:3100 refused/timeout"
    report "fyd" "unknown" "network down; fyd verdict impossible"
    exit 2
  fi
else
  report "host" "up" "local mode: running on the host"
  report "network" "up" "local mode: loopback, no tunnel in path"
fi

# ---- FYD liveness: the process answers its own health endpoint ----
HEALTH_CODE="$(curl_code "${BASE_URL}/api/fyd/healthz")"
if [ "$HEALTH_CODE" = "200" ]; then
  HEALTH_BODY="$(curl -s -m "$TIMEOUT" "${BASE_URL}/api/fyd/healthz" 2>/dev/null | head -c 400)"
  report "fyd-liveness" "up" "healthz 200 ${HEALTH_BODY}"
else
  report "fyd-liveness" "down" "healthz -> ${HEALTH_CODE}"
  OVERALL=1
fi

# ---- FYD readiness: can it serve (journal + claim store writable)? ----
READY_CODE="$(curl_code "${BASE_URL}/api/fyd/readyz")"
if [ "$READY_CODE" = "200" ]; then
  report "fyd-readiness" "ready" "readyz 200"
elif [ "$READY_CODE" = "503" ]; then
  READY_BODY="$(curl -s -m "$TIMEOUT" "${BASE_URL}/api/fyd/readyz" 2>/dev/null | head -c 600)"
  report "fyd-readiness" "not-ready" "readyz 503 ${READY_BODY}"
  OVERALL=1
else
  report "fyd-readiness" "unknown" "readyz -> ${READY_CODE}"
  OVERALL=1
fi

# ---- FYD serving smoke: a real page route still renders ----
SMOKE_CODE="$(curl_code "${BASE_URL}/sites/coppersmith-plumbing")"
if [ "$SMOKE_CODE" = "200" ]; then
  report "fyd-serving" "ok" "smoke page 200"
else
  report "fyd-serving" "degraded" "smoke page -> ${SMOKE_CODE}"
  [ "$OVERALL" = "0" ] && OVERALL=1
fi

report "fyd" "$([ "$OVERALL" = "0" ] && echo up || echo down)" "aggregate"
exit "$OVERALL"
