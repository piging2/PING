#!/usr/bin/env bash
# test-sentinel-monitors.sh — end-to-end sentinel tests for the non-gateway
# remote-parsing monitors. No network: OPS_SSH points at stub transports.
#
# For EVERY sentinel-protected check, proves the core 2026-09-27 rule:
#   transport failure (stub prints no sentinel) -> status UNKNOWN, exit 1,
#   never a false OK/WARN/CRIT parsed from transport silence.
# Plus positive controls: sentinel + healthy fixture -> the check's real
# verdict, proving the stubs exercise the real parse path.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
OW="$DIR/.."

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "ok   $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL $1 :: $2"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- stub transports ---
cat >"$TMP/stub-down" <<'EOF'
#!/usr/bin/env bash
# Simulates total transport failure: nothing executed remotely.
exit 1
EOF
cat >"$TMP/stub-up" <<'EOF'
#!/usr/bin/env bash
# Prints the canned remote transcript; ignores the piped-in script.
cat "${SENTINEL_FIXTURE:?no fixture}"
EOF
chmod +x "$TMP/stub-down" "$TMP/stub-up"

run_check() { # <check-script> <stub> [fixture]
  local script="$1" stub="$2" fixture="${3:-/dev/null}"
  OPS_SSH="$stub" SENTINEL_FIXTURE="$fixture" bash "$OW/$script" 2>/dev/null
}

# --- 1. Every sentinel-protected check: transport failure -> UNKNOWN, exit 1 ---
for c in check-container-oom-risk.sh check-deployment-drift.sh \
         check-memory-containment.sh check-pg-backup-fresh.sh \
         check-qdrant-snapshot-fresh.sh check-rpcbind-closed.sh \
         check-unexpected-listener.sh check-gateway-health.sh; do
  OUT="$(run_check "$c" "$TMP/stub-down")"; RC=$?
  case "$OUT" in
    *'"status":"UNKNOWN"'*)
      [ "$RC" = "1" ] \
        && ok "$c transport-failure UNKNOWN exit 1" \
        || bad "$c transport-failure exit" "rc=$RC out=$OUT" ;;
    *) bad "$c transport-failure UNKNOWN" "rc=$RC out=$OUT" ;;
  esac
  case "$OUT" in
    *'"status":"OK"'*|*'"status":"WARN"'*|*'"status":"CRIT"'*|*'"status":"HEALTHY"'*|*'"status":"UNHEALTHY"'*)
      bad "$c transport-failure no false verdict" "$OUT" ;;
    *) ok "$c transport-failure no false verdict" ;;
  esac
done

# --- 2. Positive controls: sentinel + healthy fixture -> real verdict ---

# container-oom-risk: low memory -> OK
printf 'SENTINEL=ORACLE_OK\nping-gateway 11.5%%\nping-postgres 4.2%%\nping-qdrant 5.1%%\n' >"$TMP/f-oom"
OUT="$(run_check check-container-oom-risk.sh "$TMP/stub-up" "$TMP/f-oom")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "oom healthy OK";; *) bad "oom healthy status" "$OUT";; esac \
  || bad "oom healthy exit" "rc=$RC out=$OUT"

# container-oom-risk: pressure -> WARN (proves the stub drives the parse path)
printf 'SENTINEL=ORACLE_OK\nping-gateway 85.0%%\nping-postgres 4.2%%\nping-qdrant 5.1%%\n' >"$TMP/f-oom-warn"
OUT="$(run_check check-container-oom-risk.sh "$TMP/stub-up" "$TMP/f-oom-warn")"; RC=$?
[ "$RC" = "1" ] && case "$OUT" in *'"status":"WARN"'*) ok "oom pressure WARN";; *) bad "oom pressure status" "$OUT";; esac \
  || bad "oom pressure exit" "rc=$RC out=$OUT"

# memory-containment: intact ceilings -> OK
printf 'SENTINEL=ORACLE_OK\nLIMIT ping-gateway 1073741824\nLIMIT ping-postgres 1073741824\nLIMIT ping-qdrant 1073741824\n' >"$TMP/f-mem"
OUT="$(run_check check-memory-containment.sh "$TMP/stub-up" "$TMP/f-mem")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "memory ceilings OK";; *) bad "memory ceilings status" "$OUT";; esac \
  || bad "memory ceilings exit" "rc=$RC out=$OUT"

# pg-backup-fresh / qdrant-snapshot-fresh: fresh backup, sidecar, timer -> OK
printf 'SENTINEL=ORACLE_OK\nage=3600 size=12345 sidecar=yes timer=enabled base=ping-postgres-20260927.dump\n' >"$TMP/f-pg"
OUT="$(run_check check-pg-backup-fresh.sh "$TMP/stub-up" "$TMP/f-pg")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "pg-backup fresh OK";; *) bad "pg-backup status" "$OUT";; esac \
  || bad "pg-backup exit" "rc=$RC out=$OUT"
printf 'SENTINEL=ORACLE_OK\nage=7200 size=999 sidecar=yes timer=enabled base=knowledge-20260927.snapshot\n' >"$TMP/f-qdrant"
OUT="$(run_check check-qdrant-snapshot-fresh.sh "$TMP/stub-up" "$TMP/f-qdrant")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "qdrant snapshot fresh OK";; *) bad "qdrant status" "$OUT";; esac \
  || bad "qdrant exit" "rc=$RC out=$OUT"

# pg-backup-fresh: stale backup -> WARN (proves the stub drives the parse path)
printf 'SENTINEL=ORACLE_OK\nage=200000 size=12345 sidecar=yes timer=enabled base=ping-postgres-old.dump\n' >"$TMP/f-pg-stale"
OUT="$(run_check check-pg-backup-fresh.sh "$TMP/stub-up" "$TMP/f-pg-stale")"; RC=$?
[ "$RC" = "1" ] && case "$OUT" in *'"status":"WARN"'*) ok "pg-backup stale WARN";; *) bad "pg-backup stale status" "$OUT";; esac \
  || bad "pg-backup stale exit" "rc=$RC out=$OUT"

# rpcbind-closed: disabled/inactive, no :111 -> OK
printf 'SENTINEL=ORACLE_OK\ndisabled\ndisabled\ninactive\ninactive\n0\n' >"$TMP/f-rpcbind"
OUT="$(run_check check-rpcbind-closed.sh "$TMP/stub-up" "$TMP/f-rpcbind")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "rpcbind closed OK";; *) bad "rpcbind status" "$OUT";; esac \
  || bad "rpcbind exit" "rc=$RC out=$OUT"

# unexpected-listener: exact baseline ports -> OK
python3 - "$OW/baselines/listeners.json" "$TMP/f-listeners" <<'EOF'
import json, sys
base = json.load(open(sys.argv[1]))
with open(sys.argv[2], "w") as f:
    f.write("SENTINEL=ORACLE_OK\n" + "\n".join(base["ports"]) + "\n")
EOF
OUT="$(run_check check-unexpected-listener.sh "$TMP/stub-up" "$TMP/f-listeners")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "listeners match baseline OK";; *) bad "listeners status" "$OUT";; esac \
  || bad "listeners exit" "rc=$RC out=$OUT"

# unexpected-listener: one new port -> WARN
cp "$TMP/f-listeners" "$TMP/f-listeners-new"
printf '0.0.0.0:9999\n' >>"$TMP/f-listeners-new"
OUT="$(run_check check-unexpected-listener.sh "$TMP/stub-up" "$TMP/f-listeners-new")"; RC=$?
[ "$RC" = "1" ] && case "$OUT" in *'"status":"WARN"'*'9999'*) ok "listeners new-port WARN";; *) bad "listeners new-port status" "$OUT";; esac \
  || bad "listeners new-port exit" "rc=$RC out=$OUT"

# deployment-drift: fixture generated from the live baseline -> OK
python3 - "$OW/baselines/gateway-inspect.json" "$TMP/f-drift" <<'EOF'
import json, sys
b = json.load(open(sys.argv[1]))
def jd(v): return json.dumps(v, separators=(",", ":"))
lines = ["SENTINEL=ORACLE_OK",
         "IMAGE " + b["image"],
         "PORTS " + jd(b["port_bindings"]),
         "RESTART " + b["restart_policy"],
         "MEM " + str(b["memory"]),
         "HCTEST " + jd(b["healthcheck_test"]),
         "HC " + " ".join([b["healthcheck_interval"], b["healthcheck_timeout"],
                           b["healthcheck_start_period"], str(b["healthcheck_retries"])])]
open(sys.argv[2], "w").write("\n".join(lines) + "\n")
EOF
OUT="$(run_check check-deployment-drift.sh "$TMP/stub-up" "$TMP/f-drift")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"OK"'*) ok "drift clean OK";; *) bad "drift status" "$OUT";; esac \
  || bad "drift exit" "rc=$RC out=$OUT"

# deployment-drift: image mismatch -> WARN
printf 'SENTINEL=ORACLE_OK\nIMAGE MISSING\n' >"$TMP/f-drift-bad"
OUT="$(run_check check-deployment-drift.sh "$TMP/stub-up" "$TMP/f-drift-bad")"; RC=$?
[ "$RC" = "1" ] && case "$OUT" in *'"status":"WARN"'*) ok "drift detected WARN";; *) bad "drift bad status" "$OUT";; esac \
  || bad "drift bad exit" "rc=$RC out=$OUT"

# gateway-health end to end: healthy fixture -> HEALTHY, exit 0
printf 'SENTINEL=ORACLE_OK\ninspect=healthy running 2026-09-24T11:55:36Z\ninspect_err=\ncurl=200\nbody=healthy\n' >"$TMP/f-gw"
OUT="$(run_check check-gateway-health.sh "$TMP/stub-up" "$TMP/f-gw")"; RC=$?
[ "$RC" = "0" ] && case "$OUT" in *'"status":"HEALTHY"'*) ok "gateway end-to-end HEALTHY";; *) bad "gateway e2e status" "$OUT";; esac \
  || bad "gateway e2e exit" "rc=$RC out=$OUT"

# gateway-health end to end: observed unhealthy -> UNHEALTHY, exit 2
printf 'SENTINEL=ORACLE_OK\ninspect=unhealthy running 2026-09-24T11:55:36Z\ninspect_err=\ncurl=500\nbody=\n' >"$TMP/f-gw-bad"
OUT="$(run_check check-gateway-health.sh "$TMP/stub-up" "$TMP/f-gw-bad")"; RC=$?
[ "$RC" = "2" ] && case "$OUT" in *'"status":"UNHEALTHY"'*) ok "gateway end-to-end UNHEALTHY";; *) bad "gateway bad status" "$OUT";; esac \
  || bad "gateway bad exit" "rc=$RC out=$OUT"

echo "---"
echo "pass=$PASS fail=$FAIL"
[ "$FAIL" = "0" ]
