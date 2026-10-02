#!/usr/bin/env bash
# gateway-classify.sh — typed gateway health classification (sourced, no network).
#
# Nolan 2026-09-27 (UNKNOWN is a legitimate state): absence of evidence across
# a failed transport is NOT evidence of remote absence. No monitor may claim
# remote absence (e.g. CONTAINER_MISSING) unless it reached the host/container
# authority and observed it. Never collapse UNKNOWN into FAILED to hide an
# observability gap.
#
# Remote scripts below print SENTINEL=ORACLE_OK as their first line. The
# classifier treats a missing sentinel as "the script never executed on the
# Oracle host": every classification from that point is a transport/host
# UNKNOWN, never a container claim.
#
# Typed reason vocabulary (Nolan 2026-09-27; exact whitelist, closed):
#   DNS_FAILED PROXY_FAILED TAILNET_UNREACHABLE SSH_FAILED HOST_UNREACHABLE
#   WSL_UNREACHABLE SERVICE_UNREACHABLE PROBE_TIMEOUT AUTH_FAILED
#   PROBE_TRANSPORT_FAILED
# Any GW_LAYER_REASON outside this list is sanitized to
# PROBE_TRANSPORT_FAILED by sanitize_layer_reason(): UNKNOWN must never
# carry an ad-hoc string.
#
# gateway_classify reads globals, sets globals:
#   In:  GW_SENTINEL ("ORACLE_OK" when the remote script ran on Oracle)
#        GW_INSPECT ("INSPECT_FAILED" when docker inspect failed remotely)
#        GW_INSPECT_ERR (docker stderr snippet, single line)
#        GW_CURL (http code, "000" when curl never completed)
#        GW_BODY (body status field, "" when absent)
#        GW_LAYER_REASON (typed transport reason; required when no sentinel)
#        GW_LAYER_SNIPPET (short stderr evidence for the transport failure)
#   Out: GW_CLASS GW_STATUS GW_EXIT GW_DETAIL
#   GW_STATUS is one of Nolan's exact truth states: HEALTHY / UNHEALTHY /
#   UNKNOWN. GW_CLASS is the typed reason (SERVICE_HEALTHY,
#   SERVICE_UNHEALTHY, SERVICE_UNREACHABLE, or a transport reason).
# Exit codes: 0 = HEALTHY, 1 = UNKNOWN (observability failure),
#             2 = UNHEALTHY (observed unhealthy/unreachable on the host).

GW_REMOTE_FULL=$(cat <<'EOF'
echo "SENTINEL=ORACLE_OK"
h=$(docker inspect -f '{{.State.Health.Status}} {{.State.Status}} {{.State.StartedAt}}' ping-gateway 2>/tmp/gw-di.err || echo INSPECT_FAILED)
echo "inspect=$h"
echo "inspect_err=$(tr '\n' ' ' </tmp/gw-di.err 2>/dev/null)"
resp=$(curl -s -w '\n%{http_code}' --max-time 10 http://127.0.0.1:8080/health 2>/dev/null || printf '\n000')
echo "curl=$(echo "$resp" | tail -n 1)"
echo "body=$(echo "$resp" | grep -o '"status":"[a-z]*"' | head -1 | cut -d'"' -f4)"
EOF
)

GW_REMOTE_INSPECT_ONLY=$(cat <<'EOF'
echo "SENTINEL=ORACLE_OK"
h=$(docker inspect -f '{{.State.Health.Status}} {{.State.Status}}' ping-gateway 2>/tmp/gw-di.err || echo INSPECT_FAILED)
echo "inspect=$h"
echo "inspect_err=$(tr '\n' ' ' </tmp/gw-di.err 2>/dev/null)"
EOF
)

gateway_classify() {
  GW_CLASS=""; GW_STATUS=""; GW_EXIT=""; GW_DETAIL=""
  if [ "${GW_SENTINEL:-}" != "ORACLE_OK" ]; then
    # The script never executed on the Oracle host. Nothing about the
    # container or service was observed. UNKNOWN is the only honest state.
    # GW_LAYER_REASON is sanitized first: UNKNOWN reasons are drawn ONLY
    # from the closed 10-reason whitelist; anything unrecognized becomes
    # PROBE_TRANSPORT_FAILED, never an ad-hoc string.
    sanitize_layer_reason
    GW_CLASS="${GW_LAYER_REASON}"
    GW_STATUS="UNKNOWN"; GW_EXIT=1
    GW_DETAIL="probe transport failed (${GW_CLASS}): ${GW_LAYER_SNIPPET:-no stderr captured}; gateway state UNKNOWN, not proven down; no container claim made"
    return 0
  fi
  # The probe reached the Oracle host authority: container/service claims
  # below are legitimate observations, not transport artifacts.
  if [ "${GW_INSPECT:-}" = "INSPECT_FAILED" ] || [ -z "${GW_INSPECT:-}" ]; then
    GW_CLASS="SERVICE_UNREACHABLE"; GW_STATUS="UNHEALTHY"; GW_EXIT=2
    case "${GW_INSPECT_ERR:-}" in
      *"No such container"*|*"No such object"*)
        GW_DETAIL="ping-gateway container absent on reachable host (observed via docker inspect on Oracle): ${GW_INSPECT_ERR}" ;;
      *"Cannot connect to the Docker daemon"*)
        GW_DETAIL="docker daemon unreachable on Oracle host (observed): ${GW_INSPECT_ERR}" ;;
      *)
        GW_DETAIL="docker inspect failed on reachable host (observed): ${GW_INSPECT_ERR:-no docker error captured}" ;;
    esac
    return 0
  fi
  local health_word="${GW_INSPECT%% *}"
  if [ "$health_word" = "healthy" ] && [ "${GW_CURL:-000}" = "200" ] && [ "${GW_BODY:-}" = "healthy" ]; then
    GW_CLASS="SERVICE_HEALTHY"; GW_STATUS="HEALTHY"; GW_EXIT=0
    GW_DETAIL="gateway healthy, /health=200 body=healthy (observed: ${GW_INSPECT} http=${GW_CURL})"
    return 0
  fi
  GW_CLASS="SERVICE_UNHEALTHY"; GW_STATUS="UNHEALTHY"; GW_EXIT=2
  GW_DETAIL="gateway not healthy (observed): health=${GW_INSPECT} http=${GW_CURL:-000} body=${GW_BODY:-empty}"
  return 0
}

# sanitize_layer_reason -> sets GW_LAYER_REASON.
# Deterministic whitelist enforcement for the UNKNOWN path: GW_LAYER_REASON
# may be exactly one of Nolan's 10 typed reasons. An empty or unrecognized
# value is collapsed to PROBE_TRANSPORT_FAILED. Pure string membership;
# no network, no probes.
GW_UNKNOWN_REASONS="DNS_FAILED PROXY_FAILED TAILNET_UNREACHABLE SSH_FAILED HOST_UNREACHABLE WSL_UNREACHABLE SERVICE_UNREACHABLE PROBE_TIMEOUT AUTH_FAILED PROBE_TRANSPORT_FAILED"

sanitize_layer_reason() {
  local r="${GW_LAYER_REASON:-}"
  case " ${GW_UNKNOWN_REASONS} " in
    *" ${r} "*)
      GW_LAYER_REASON="${r}" ;;
    *)
      GW_LAYER_REASON="PROBE_TRANSPORT_FAILED" ;;
  esac
}

# type_transport_from_stderr <full-chain-stderr-file>
# Sets GW_LAYER_REASON / GW_LAYER_SNIPPET purely from the stderr captured by
# the single main probe. Makes NO additional probes: Nolan 2026-09-27, "no
# extra probes". Layer certainty that cannot be read from this one stderr is
# left at PROBE_TRANSPORT_FAILED rather than manufactured; UNKNOWN is a
# legitimate terminal classification.
type_transport_from_stderr() {
  local err_f="$1"
  GW_LAYER_REASON="$(reason_from_stderr "$err_f")"
  GW_LAYER_SNIPPET="$(tr '\n' ' ' <"$err_f" 2>/dev/null | head -c 160)"
  [ -z "${GW_LAYER_SNIPPET:-}" ] && GW_LAYER_SNIPPET="no stderr captured"
}

# reason_from_stderr <stderr-file> -> prints the typed transport reason.
# Pure string matching over ssh/proxy diagnostics; no network.
reason_from_stderr() {
  local t
  t=$(tr '\n' ' ' <"$1" 2>/dev/null | head -c 200)
  case "$t" in
    *ame\ or\ service\ not\ known*|*ould\ not\ resolve*|*emporary\ failure\ in\ name\ resolution*|*NXDOMAIN*|*nameresolution*) echo "DNS_FAILED" ;;
    # PROBE_TIMEOUT is the harness-level timeout only ("probe timed out",
    # timeout(1)'s "command timed out" / "killing"): a plain ssh-layer
    # "Connection timed out" still falls through to SSH_FAILED. Order
    # matters; this arm must stay before the generic *imeout* SSH_FAILED arm.
    *robe\ timed\ out*|*robe\ timeout*|*ommand\ timed\ out*|*imeout:\ killing*|*imeout:\ sending*) echo "PROBE_TIMEOUT" ;;
    *roxy*"Broken pipe"*|*roxy*"refused"*|*roxy*"failed"*) echo "PROXY_FAILED" ;;
    *UNKNOWN*port*65535*) echo "TAILNET_UNREACHABLE" ;;
    *ermission\ denied*|*ublickey*) echo "AUTH_FAILED" ;;
    *imed\ out*|*imeout*|*onnection\ reset*) echo "SSH_FAILED" ;;
    *) echo "PROBE_TRANSPORT_FAILED" ;;
  esac
}
