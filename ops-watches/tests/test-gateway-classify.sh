#!/usr/bin/env bash
# test-gateway-classify.sh — deterministic unit tests for gateway-classify.sh
# and degrades-counter.py. No network: all fixtures are inline.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
. "$DIR/../gateway-classify.sh"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "ok   $1"; }
bad()  { FAIL=$((FAIL+1)); echo "FAIL $1 :: $2"; }

# --- classifier: transport failure is UNKNOWN, never "container missing" ---
GW_SENTINEL=""; GW_INSPECT=""; GW_INSPECT_ERR=""; GW_CURL=""; GW_BODY=""
GW_LAYER_REASON="PROXY_FAILED"; GW_LAYER_SNIPPET="nc: proxy read: Broken pipe"
gateway_classify
[ "$GW_CLASS" = "PROXY_FAILED" ] && [ "$GW_STATUS" = "UNKNOWN" ] && [ "$GW_EXIT" = "1" ] \
  && ok "transport-failure class/exit" || bad "transport-failure class/exit" "class=$GW_CLASS status=$GW_STATUS exit=$GW_EXIT"
case "$GW_DETAIL" in
  *"container missing"*|*"CONTAINER_MISSING"*) bad "no container claim on transport failure" "$GW_DETAIL" ;;
  *) ok "no container claim on transport failure" ;;
esac
case "$GW_DETAIL" in
  *"not proven down"*) ok "detail says not proven down" ;;
  *) bad "detail says not proven down" "$GW_DETAIL" ;;
esac

# --- classifier: UNKNOWN reason sanitize (closed whitelist enforcement) ---
GW_SENTINEL=""; GW_INSPECT=""; GW_INSPECT_ERR=""; GW_CURL=""; GW_BODY=""
GW_LAYER_REASON="DNS_FAILED"; GW_LAYER_SNIPPET="could not resolve hostname"
gateway_classify
[ "$GW_CLASS" = "DNS_FAILED" ] && [ "$GW_STATUS" = "UNKNOWN" ] && [ "$GW_EXIT" = "1" ] \
  && ok "whitelisted DNS_FAILED passes through" || bad "DNS_FAILED passthrough" "class=$GW_CLASS status=$GW_STATUS exit=$GW_EXIT"
GW_LAYER_REASON="PROBE_TIMEOUT"
gateway_classify
[ "$GW_CLASS" = "PROBE_TIMEOUT" ] && [ "$GW_STATUS" = "UNKNOWN" ] \
  && ok "whitelisted PROBE_TIMEOUT passes through" || bad "PROBE_TIMEOUT passthrough" "class=$GW_CLASS status=$GW_STATUS"
GW_LAYER_REASON="SOMETHING_ADHOC"
gateway_classify
[ "$GW_CLASS" = "PROBE_TRANSPORT_FAILED" ] && [ "$GW_STATUS" = "UNKNOWN" ] && [ "$GW_EXIT" = "1" ] \
  && ok "adhoc reason sanitized to PROBE_TRANSPORT_FAILED" || bad "adhoc sanitize" "class=$GW_CLASS status=$GW_STATUS exit=$GW_EXIT"
unset GW_LAYER_REASON
gateway_classify
[ "$GW_CLASS" = "PROBE_TRANSPORT_FAILED" ] && [ "$GW_STATUS" = "UNKNOWN" ] \
  && ok "unset reason sanitized to PROBE_TRANSPORT_FAILED" || bad "unset sanitize" "class=$GW_CLASS status=$GW_STATUS"
for _r in DNS_FAILED PROXY_FAILED TAILNET_UNREACHABLE SSH_FAILED HOST_UNREACHABLE WSL_UNREACHABLE SERVICE_UNREACHABLE PROBE_TIMEOUT AUTH_FAILED PROBE_TRANSPORT_FAILED; do
  GW_LAYER_REASON="$_r"; gateway_classify
  [ "$GW_CLASS" = "$_r" ] && [ "$GW_STATUS" = "UNKNOWN" ] && ok "whitelist member $_r survives" || bad "whitelist member $_r" "class=$GW_CLASS status=$GW_STATUS"
done

# --- classifier: HOST_UNREACHABLE (Oracle leg) ---
GW_LAYER_REASON="HOST_UNREACHABLE"; GW_LAYER_SNIPPET="ssh: connect to host 129.146.60.17 port 22: Connection timed out"
gateway_classify
[ "$GW_CLASS" = "HOST_UNREACHABLE" ] && [ "$GW_EXIT" = "1" ] \
  && ok "host-unreachable UNKNOWN" || bad "host-unreachable UNKNOWN" "class=$GW_CLASS exit=$GW_EXIT"

# --- classifier: healthy path ---
GW_SENTINEL="ORACLE_OK"; GW_INSPECT="healthy running 2026-09-24T11:55:36Z"
GW_INSPECT_ERR=""; GW_CURL="200"; GW_BODY="healthy"
gateway_classify
[ "$GW_CLASS" = "SERVICE_HEALTHY" ] && [ "$GW_STATUS" = "HEALTHY" ] && [ "$GW_EXIT" = "0" ] \
  && ok "healthy HEALTHY" || bad "healthy HEALTHY" "class=$GW_CLASS status=$GW_STATUS exit=$GW_EXIT"

# --- classifier: container genuinely absent (observed on host) ---
GW_INSPECT="INSPECT_FAILED"; GW_INSPECT_ERR="Error: No such container: ping-gateway"
gateway_classify
[ "$GW_CLASS" = "SERVICE_UNREACHABLE" ] && [ "$GW_STATUS" = "UNHEALTHY" ] && [ "$GW_EXIT" = "2" ] \
  && ok "absent-container UNHEALTHY" || bad "absent-container UNHEALTHY" "class=$GW_CLASS exit=$GW_EXIT status=$GW_STATUS"
case "$GW_DETAIL" in
  *"container absent on reachable host"*) ok "absent-container detail names observation" ;;
  *) bad "absent-container detail names observation" "$GW_DETAIL" ;;
esac

# --- classifier: docker daemon down ---
GW_INSPECT_ERR="Cannot connect to the Docker daemon at unix:///var/run/docker.sock"
gateway_classify
[ "$GW_CLASS" = "SERVICE_UNREACHABLE" ] \
  && ok "docker-daemon-down SERVICE_UNREACHABLE" || bad "docker-daemon-down" "class=$GW_CLASS"

# --- classifier: unhealthy container ---
GW_INSPECT="unhealthy running 2026-09-24T11:55:36Z"; GW_INSPECT_ERR=""
gateway_classify
[ "$GW_CLASS" = "SERVICE_UNHEALTHY" ] && [ "$GW_STATUS" = "UNHEALTHY" ] && [ "$GW_EXIT" = "2" ] \
  && ok "unhealthy UNHEALTHY" || bad "unhealthy UNHEALTHY" "class=$GW_CLASS exit=$GW_EXIT status=$GW_STATUS"

# --- classifier: docker healthy but /health not 200 ---
GW_INSPECT="healthy running 2026-09-24T11:55:36Z"; GW_CURL="000"; GW_BODY=""
gateway_classify
[ "$GW_CLASS" = "SERVICE_UNHEALTHY" ] \
  && ok "healthy-container-dead-endpoint SERVICE_UNHEALTHY" || bad "healthy-container-dead-endpoint" "class=$GW_CLASS"

# --- reason_from_stderr typing ---
t() { local f; f="$(mktemp)"; printf '%s' "$1" >"$f"; reason_from_stderr "$f"; rm -f "$f"; }
[ "$(t 'nc: proxy read: Broken pipe')" = "PROXY_FAILED" ] && ok "stderr PROXY_FAILED" || bad "stderr PROXY_FAILED" "$(t 'nc: proxy read: Broken pipe')"
[ "$(t 'Connection closed by UNKNOWN port 65535')" = "TAILNET_UNREACHABLE" ] && ok "stderr TAILNET_UNREACHABLE" || bad "stderr TAILNET_UNREACHABLE" ""
[ "$(t 'Permission denied (publickey)')" = "AUTH_FAILED" ] && ok "stderr AUTH_FAILED" || bad "stderr AUTH_FAILED" ""
[ "$(t 'ssh: connect to host x port 22: Connection timed out')" = "SSH_FAILED" ] && ok "stderr SSH_FAILED" || bad "stderr SSH_FAILED" ""
[ "$(t 'something completely novel')" = "PROBE_TRANSPORT_FAILED" ] && ok "stderr fallback PROBE_TRANSPORT_FAILED" || bad "stderr fallback" ""
[ "$(t 'ssh: Could not resolve hostname pigwsl: Name or service not known')" = "DNS_FAILED" ] && ok "stderr DNS_FAILED" || bad "stderr DNS_FAILED" ""
[ "$(t 'Temporary failure in name resolution')" = "DNS_FAILED" ] && ok "stderr DNS_FAILED temp failure" || bad "stderr DNS_FAILED temp failure" ""
[ "$(t 'timeout: sending signal TERM to command; command timed out')" = "PROBE_TIMEOUT" ] && ok "stderr PROBE_TIMEOUT" || bad "stderr PROBE_TIMEOUT" ""
[ "$(t 'probe timed out after 60s')" = "PROBE_TIMEOUT" ] && ok "stderr PROBE_TIMEOUT explicit" || bad "stderr PROBE_TIMEOUT explicit" ""
[ "$(t 'ssh: connect to host pigwsl port 22: Connection timed out')" = "SSH_FAILED" ] && ok "stderr ssh-layer timeout stays SSH_FAILED" || bad "stderr ssh timeout precedence" ""

# --- type_transport_from_stderr: classifies from the single probe's stderr,
# no additional probes (Nolan 2026-09-27, no extra probes) ---
mkerr() { local f; f="$(mktemp)"; printf '%s' "$1" >"$f"; echo "$f"; }
E="$(mkerr 'nc: proxy read: Broken pipe')"
type_transport_from_stderr "$E"; rm -f "$E"
[ "$GW_LAYER_REASON" = "PROXY_FAILED" ] \
  && ok "from-stderr PROXY_FAILED" || bad "from-stderr PROXY_FAILED" "$GW_LAYER_REASON"
E="$(mkerr 'something completely novel')"
type_transport_from_stderr "$E"; rm -f "$E"
[ "$GW_LAYER_REASON" = "PROBE_TRANSPORT_FAILED" ] \
  && ok "from-stderr fallback PROBE_TRANSPORT_FAILED" || bad "from-stderr fallback" "$GW_LAYER_REASON"
# the extra-probe machinery must be gone: no pig_layer_probe, no PIG_SSH
type pig_layer_probe >/dev/null 2>&1 && bad "pig_layer_probe removed" "still defined" || ok "pig_layer_probe removed"
[ -z "${PIG_SSH+x}" ] && ok "PIG_SSH removed" || bad "PIG_SSH removed" "still set"
# layer certainty is never manufactured: ambiguous stderr stays UNKNOWN-typed
GW_SENTINEL=""; GW_INSPECT=""; GW_INSPECT_ERR=""; GW_CURL=""; GW_BODY=""
gateway_classify
[ "$GW_STATUS" = "UNKNOWN" ] && [ "$GW_EXIT" = "1" ] \
  && ok "from-stderr failure stays UNKNOWN" || bad "from-stderr failure stays UNKNOWN" "status=$GW_STATUS exit=$GW_EXIT"

# --- lib.sh sentinel helpers: no sentinel -> UNKNOWN, never false OK/CRIT ---
. "$DIR/../lib.sh"
( fail_unknown_unless_sentinel probe-x "transport failed" "" )
[ "$?" = "1" ] && ok "fail_unknown exit 1 without sentinel" || bad "fail_unknown exit" "$?"
OUT_SENT="$(( fail_unknown_unless_sentinel probe-x "transport failed detail" "" ) 2>&1)"
case "$OUT_SENT" in *'"status":"UNKNOWN"'*) ok "fail_unknown emits UNKNOWN" ;; *) bad "fail_unknown emits UNKNOWN" "$OUT_SENT" ;; esac
case "$OUT_SENT" in *"transport failed detail"*) ok "fail_unknown carries caller detail" ;; *) bad "fail_unknown caller detail" "$OUT_SENT" ;; esac
( fail_unknown_unless_sentinel probe-x "transport failed" $'SENTINEL=ORACLE_OK\nage=1' )
[ "$?" = "0" ] && ok "fail_unknown passes with sentinel" || bad "fail_unknown with sentinel" "$?"
S2="$(strip_sentinel $'SENTINEL=ORACLE_OK\nage=1\nsize=2')"
[ "$S2" = $'age=1\nsize=2' ] && ok "strip_sentinel removes sentinel line" || bad "strip_sentinel" "$S2"

# --- degrades-counter.py ---
PY="$DIR/../degrades-counter.py"
mkstate() { local f; f="$(mktemp)"; printf '{"gateway_health_degrades":{"consecutive_non_healthy":%s}}' "$1" >"$f"; echo "$f"; }

S="$(mkstate 1)"; R="$(python3 "$PY" "$S" PROXY_FAILED)"
[ "$R" = "HOLD 1 PROXY_FAILED" ] && [ "$(python3 -c "import json;print(json.load(open('$S'))['gateway_health_degrades']['consecutive_non_healthy'])")" = "1" ] \
  && ok "counter HOLD on UNKNOWN" || bad "counter HOLD on UNKNOWN" "$R"
S="$(mkstate 1)"; R="$(python3 "$PY" "$S" HOST_UNREACHABLE)"
[ "$R" = "HOLD 1 HOST_UNREACHABLE" ] && ok "counter HOLD on HOST_UNREACHABLE" || bad "counter HOLD on HOST_UNREACHABLE" "$R"
S="$(mkstate 3)"; R="$(python3 "$PY" "$S" DNS_FAILED)"
[ "$R" = "HOLD 3 DNS_FAILED" ] && ok "counter HOLD on DNS_FAILED" || bad "counter HOLD on DNS_FAILED" "$R"
S="$(mkstate 3)"; R="$(python3 "$PY" "$S" PROBE_TIMEOUT)"
[ "$R" = "HOLD 3 PROBE_TIMEOUT" ] && ok "counter HOLD on PROBE_TIMEOUT" || bad "counter HOLD on PROBE_TIMEOUT" "$R"
S="$(mkstate 2)"; R="$(python3 "$PY" "$S" SERVICE_HEALTHY)"
[ "$R" = "RESET 0 SERVICE_HEALTHY" ] && ok "counter RESET on HEALTHY" || bad "counter RESET on HEALTHY" "$R"
S="$(mkstate 1)"; R="$(python3 "$PY" "$S" SERVICE_UNHEALTHY)"
[ "$R" = "FAIL 2 SERVICE_UNHEALTHY" ] && ok "counter FAIL increments on UNHEALTHY" || bad "counter increment" "$R"
S="$(mkstate 0)"; R="$(python3 "$PY" "$S" SERVICE_UNREACHABLE)"
[ "$R" = "FAIL 1 SERVICE_UNREACHABLE" ] && ok "counter FAIL increments on UNREACHABLE" || bad "counter increment unreachable" "$R"
S="$(mkstate 0)"
if python3 "$PY" "$S" BOGUS_CLASS >/dev/null 2>&1; then bad "counter rejects unknown class" "exit 0"; else ok "counter rejects unknown class"; fi
# last_probe_class is recorded
S="$(mkstate 0)"; python3 "$PY" "$S" TAILNET_UNREACHABLE >/dev/null
[ "$(python3 -c "import json;print(json.load(open('$S'))['gateway_health_degrades']['last_probe_class'])")" = "TAILNET_UNREACHABLE" ] \
  && ok "counter records last_probe_class" || bad "counter records last_probe_class" ""

echo "---"
echo "pass=$PASS fail=$FAIL"
[ "$FAIL" = "0" ]
