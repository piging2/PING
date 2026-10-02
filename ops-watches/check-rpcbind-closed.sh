#!/usr/bin/env bash
# check: rpcbind-closed — rpcbind must stay disabled, stopped, and off :111.
# Baseline OPS-001 (2026-09-24): service+socket disabled/stopped, no :111 listener.
set -u
. "$(dirname "$0")/lib.sh"

REMOTE=$(cat <<'EOF'
echo SENTINEL=ORACLE_OK
en1=$(systemctl is-enabled rpcbind 2>/dev/null | head -1 || true); [ -z "$en1" ] && en1=unknown
en2=$(systemctl is-enabled rpcbind.socket 2>/dev/null | head -1 || true); [ -z "$en2" ] && en2=unknown
a1=$(systemctl is-active rpcbind 2>/dev/null | head -1 || true); [ -z "$a1" ] && a1=unknown
a2=$(systemctl is-active rpcbind.socket 2>/dev/null | head -1 || true); [ -z "$a2" ] && a2=unknown
l111=$(ss -tln 2>/dev/null | grep -c -e ':111[[:space:]]' || true)
echo "$en1"; echo "$en2"; echo "$a1"; echo "$a2"; echo "$l111"
EOF
)
OUT="$(run_remote "$REMOTE")"
fail_unknown_unless_sentinel rpcbind-closed "probe transport failed; rpcbind state UNKNOWN, not proven closed or open" "$OUT"
BODY="$(strip_sentinel "$OUT")"
en1="$(echo "$BODY" | sed -n '1p')"; en2="$(echo "$BODY" | sed -n '2p')"
a1="$(echo "$BODY" | sed -n '3p')"; a2="$(echo "$BODY" | sed -n '4p')"
l111="$(echo "$BODY" | sed -n '5p')"
DETAIL="units=${en1}/${en2} active=${a1}/${a2} port111_listeners=${l111}"
if [ "$l111" != "0" ]; then
  emit rpcbind-closed CRIT "CRITICAL: listener on :111 present. $DETAIL"; exit 2
fi
if [ "$en1" != "disabled" ] || [ "$en2" != "disabled" ]; then
  emit rpcbind-closed WARN "rpcbind re-enabled ($en1/$en2). $DETAIL"; exit 1
fi
if [ "$a1" = "active" ] || [ "$a2" = "active" ]; then
  emit rpcbind-closed WARN "rpcbind running while disabled ($a1/$a2). $DETAIL"; exit 1
fi
emit rpcbind-closed OK "rpcbind closed: disabled+inactive, no :111 listener. $DETAIL"; exit 0
