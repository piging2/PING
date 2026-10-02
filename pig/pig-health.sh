#!/bin/bash
# pig-health.sh -- read-only Pig health aggregate with state-transition alerting.
# Three failure domains, reported separately (2026-09-24, Nolan: stop calling
# every unreachable condition "Pig down"):
#   HOST    - SSH reachability. UP / UNKNOWN. HOST_ASLEEP is reserved for
#             positive host power-state evidence; absence of reachability is
#             never evidence of sleep (2026-09-28: the standby-history
#             default was removed; see
#             antifragility/tests/test-host-sleep-classifier.sh).
#   NETWORK - tailnet path via proxy CONNECT to :22. UP / DOWN.
#   FYD     - :3100 served surface. UP / DOWN (no listener on WSL localhost) /
#             UNREADY (answers but not 200).
# Post-wake bounded convergence: a 507 resume within the last 150s labels the
# state NETWORK_RECONVERGING (covers the observed ~73s WiFi/Tailscale gap)
# instead of declaring a new application incident.
# Checks: proxy-CONNECT, SSH, WSL liveness, Docker daemon, ping-postgres,
# ping-gateway, :3100 (WSL-local process truth + tailnet served truth),
# :18199 journal gateway, Ask FYD read path, CDP 9223/9225/9226/9227
# (via cdp-health.sh), disk pressure, Windows last-boot and last-wake.
# Writes health-state.json (last known) and appends
# health-log.jsonl ONLY on state transitions.
#
# Five capability states (2026-09-26, restart-survival): the state file carries
# a "capabilities" object with one entry per capability, each holding
# state / as_of / source / evidence. Capabilities are independent: one can be
# FAIL while others are UP. Readers MUST render a capability STALE (never green)
# when its as_of is older than 15 minutes. A capability goes green ONLY on a
# fresh successful probe, never on "a restart was attempted".
#   machine.reachable   - Pig answers on the tailnet at all (HOST domain).
#   wsl.ready           - WSL distro booted AND responsive.
#   docker.workload_ready - dockerd answering AND expected containers running.
#   fyd.page_healthy    - :3100 listener present AND tailnet 200.
#   ask.read_path_healthy - :18199 listener present AND Ask FYD returns ok:true.
# Exit 0 = UP, 1 = anything else (so a scheduler surfaces it).
# Read-only: makes no changes on the Pig. No credentials handled.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AF_DIR="$HERE/antifragility"
STATE_FILE="$AF_DIR/health-state.json"
LOG_FILE="$AF_DIR/health-log.jsonl"
mkdir -p "$AF_DIR"

# shellcheck disable=SC1091
source "$HERE/../pig-fb/pig-ssh.sh"

NOW_DENVER="$(TZ=America/Denver date +%H:%M)"

declare -A CHECKS
declare -A DOMAINS   # HOST / NETWORK / FYD -> domain label
overall="UP"

# DOMAIN: NETWORK -- can we reach the tailnet path at all? Raw HTTP CONNECT to
# :22 through the egress proxy; a "200" means the TCP path to the Pig is open.
# No SSH involved. (The local nc build has no proxy support, hence python.)
net_probe="$(timeout 12 python3 -c '
import socket
s = socket.create_connection(("hatch-egress-proxy", 3130), timeout=8)
s.sendall(b"CONNECT 100.79.154.43:22 HTTP/1.1\r\nHost: 100.79.154.43:22\r\n\r\n")
print(s.recv(12).decode("latin1", "replace"))
s.close()
' 2>/dev/null || true)"
if printf '%s' "$net_probe" | grep -q " 200"; then
  DOMAINS[NETWORK]="UP"
else
  DOMAINS[NETWORK]="DOWN"
fi

# DOMAIN: HOST -- SSH reachability (fast probe, no WSL hop)
ssh_start=$(date +%s)
if PIG_TIMEOUT=12 pig_ssh "echo PIG_SSH_OK" 2>/dev/null | grep -q PIG_SSH_OK; then
  DOMAINS[HOST]="UP"
  CHECKS[ssh]="ok"
else
  ssh_elapsed=$(( $(date +%s) - ssh_start ))
  if [ "${DOMAINS[NETWORK]}" = "DOWN" ] && [ "$ssh_elapsed" -lt 8 ]; then
    DOMAINS[HOST]="UNKNOWN"
    CHECKS[ssh]="down (tailnet path failed fast; host state unknown)"
    overall="NETWORK_DOWN"
  else
    # Absence of reachability is NOT evidence of sleep. Without positive
    # host power-state evidence the only honest classification is UNKNOWN.
    DOMAINS[HOST]="UNKNOWN"
    CHECKS[ssh]="down (no answer after ${ssh_elapsed}s; no positive sleep evidence; host state unknown)"
    overall="UNKNOWN_REACHABILITY_FAILURE"
  fi
fi

if [ "${DOMAINS[HOST]}" = "UP" ]; then
  # 2-6. One consolidated WSL-side probe (kept short for pigwsl-run.sh).
  # Bound with timeout: pigwsl-run.sh has no internal timeout, and a stalled
  # SSH tunnel here used to hang the whole run until the scheduler killed it
  # (2026-09-23 20:17 MDT tick). Empty output degrades gracefully below.
  probe_out="$(timeout 60 "$HERE/pigwsl-run.sh" 'echo "WSL_UPTIME=$(cut -d. -f1 /proc/uptime)"; docker ps >/dev/null 2>&1 && echo "DOCKER=ok" || echo "DOCKER=down"; docker inspect ping-postgres --format "PG={{.State.Status}}/{{.HostConfig.RestartPolicy.Name}}" 2>/dev/null || echo "PG=missing"; docker inspect ping-gateway --format "GW={{.State.Status}}" 2>/dev/null || echo "GW=missing"; echo "DISK_PCT=$(df / --output=pcent 2>/dev/null | tail -1 | tr -dc 0-9)"; echo "FYD_LOCAL=$(curl -s -o /dev/null -w %{http_code} --max-time 8 http://localhost:3100/ 2>/dev/null || echo 000)"; curl -s --max-time 8 http://127.0.0.1:18199/ 2>/dev/null | grep -q "\"ok\":true" && echo "JGW_18199=ok" || echo "JGW_18199=down"; /home/nolan/ask-probe.sh >/dev/null 2>&1 && echo "ASK_OK=yes" || echo "ASK_OK=no"' 2>/dev/null || true)"
  wsl_up="$(printf '%s' "$probe_out" | grep -o 'WSL_UPTIME=[0-9]*' | cut -d= -f2)"
  [ -n "$wsl_up" ] && CHECKS[wsl]="ok uptime_s=$wsl_up" || { CHECKS[wsl]="down"; overall="DEGRADED"; }
  printf '%s' "$probe_out" | grep -q 'DOCKER=ok' && CHECKS[docker]="ok" || { CHECKS[docker]="down"; overall="DEGRADED"; }
  pg_line="$(printf '%s' "$probe_out" | grep -o 'PG=[^ ]*' | head -1)"
  case "$pg_line" in
    PG=running/*) CHECKS[postgres]="ok ${pg_line#PG=}" ;;
    *) CHECKS[postgres]="bad ${pg_line:-missing}"; overall="DEGRADED" ;;
  esac
  gw_line="$(printf '%s' "$probe_out" | grep -o 'GW=[^ ]*' | head -1)"
  [ "$gw_line" = "GW=running" ] && CHECKS[gateway]="ok" || { CHECKS[gateway]="bad ${gw_line:-missing}"; overall="DEGRADED"; }
  jgw_line="$(printf '%s' "$probe_out" | grep -o 'JGW_18199=[^ ]*' | head -1)"
  [ "$jgw_line" = "JGW_18199=ok" ] && CHECKS[journal_gateway]="ok (:18199 ok:true)" || { CHECKS[journal_gateway]="down (:18199 not answering ok:true)"; overall="DEGRADED"; }
  ask_line="$(printf '%s' "$probe_out" | grep -o 'ASK_OK=[^ ]*' | head -1)"
  [ "$ask_line" = "ASK_OK=yes" ] && CHECKS[ask]="ok (Ask FYD ok:true)" || { CHECKS[ask]="bad (Ask FYD probe failed)"; overall="DEGRADED"; }
  disk="$(printf '%s' "$probe_out" | grep -o 'DISK_PCT=[0-9]*' | cut -d= -f2)"
  if [ -n "$disk" ]; then
    CHECKS[disk]="ok ${disk}%"
    [ "$disk" -ge 90 ] && { CHECKS[disk]="high ${disk}%"; overall="DEGRADED"; }
  else
    CHECKS[disk]="unknown"; overall="DEGRADED"
  fi
  # 6b. Windows C: disk pressure (independent of WSL; catches host disk exhaustion
  # that crashes WSL distros). Alert if C: has less than 5% free (crash occurred at 0.1%).
  win_disk="$(PIG_TIMEOUT=15 pig_ssh 'powershell -NoProfile -Command "$d=Get-PSDrive C; [math]::Round($d.Free/($d.Used+$d.Free)*100,1)"' 2>/dev/null | tr -d '\r' | tail -1 || true)"
  if [ -n "$win_disk" ]; then
    # win_disk is percent FREE; alert if < 5% free
    win_free_int="$(printf '%s' "$win_disk" | cut -d. -f1)"
    if [ "$win_free_int" -lt 5 ]; then
      CHECKS[win_disk]="CRITICAL ${win_disk}% free on C:"
      overall="DEGRADED"
    else
      CHECKS[win_disk]="ok ${win_disk}% free on C:"
    fi
  else
    CHECKS[win_disk]="unknown"
  fi
  # 7. Windows last boot (reboot detection). Bounded: see note on the WSL probe above.
  win_boot="$(timeout 45 "$HERE/pigwsl-run.sh" 'powershell.exe -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime | Get-Date -Format yyyy-MM-ddTHH:mm"' 2>/dev/null | tr -d '\r' | tail -1 || true)"
  [ -n "$win_boot" ] && CHECKS[win_boot]="ok $win_boot" || CHECKS[win_boot]="unknown"

  # 7b. DOMAIN: FYD -- :3100 process truth (WSL localhost) and served truth
  # (the tailnet path Nolan's phone traverses, via the egress proxy).
  fyd_local="$(printf '%s' "$probe_out" | grep -o 'FYD_LOCAL=[0-9]*' | cut -d= -f2)"
  fyd_via_net="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -x http://hatch-egress-proxy:3130 http://100.79.154.43:3100/ 2>/dev/null || echo 000)"
  if [ "$fyd_local" = "200" ] && [ "$fyd_via_net" = "200" ]; then
    DOMAINS[FYD]="UP"
    CHECKS[fyd]="ok (WSL-local 200, tailnet 200)"
  elif [ "$fyd_local" = "200" ]; then
    DOMAINS[FYD]="UP"
    CHECKS[fyd]="ok locally (200); tailnet path returned $fyd_via_net"
    [ "$overall" = "UP" ] && overall="DEGRADED"
  elif [ "$fyd_local" = "000" ] || [ -z "$fyd_local" ]; then
    DOMAINS[FYD]="DOWN"
    CHECKS[fyd]="down (no listener on WSL localhost:3100)"
    overall="FYD_DOWN"
  else
    DOMAINS[FYD]="UNREADY"
    CHECKS[fyd]="unready (WSL-local http $fyd_local)"
    overall="FYD_UNREADY"
  fi

  # 7c. Post-wake bounded convergence: a 507 resume within the last 150s means
  # WiFi/Tailscale may still be reconverging (observed ~73s gap on 2026-09-24).
  # Inside the window, HOST/NETWORK/FYD wobble is reported as
  # NETWORK_RECONVERGING rather than a new application incident.
  wake_iso="$(timeout 45 "$HERE/pigwsl-run.sh" 'powershell.exe -NoProfile -Command "(Get-WinEvent -FilterHashtable @{LogName='\''System'\''; ID=507} -MaxEvents 1 -ErrorAction SilentlyContinue).TimeCreated.ToUniversalTime().ToString('\''o'\'')"' 2>/dev/null | tr -d '\r' | tail -1 || true)"
  if [ -n "$wake_iso" ]; then
    wake_epoch="$(date -d "$wake_iso" +%s 2>/dev/null || echo 0)"
    now_epoch="$(date +%s)"
    wake_age=$(( now_epoch - wake_epoch ))
    CHECKS[last_wake]="ok ${wake_age}s ago"
    if [ "$wake_age" -ge 0 ] && [ "$wake_age" -lt 150 ]; then
      case "$overall" in
        UP) ;;
        *) CHECKS[reconvergence_note]="suppressed '$overall' inside 150s post-wake window"
           overall="NETWORK_RECONVERGING" ;;
      esac
    fi
  else
    CHECKS[last_wake]="unknown"
  fi

  # 7d. FYD watchdog projection (2026-09-26): read-only summary of the Pig-local
  # watchdog durable log into the existing health surface. The log file remains
  # the single source of truth; only LAST PROBE / LAST HEALTHY / LAST FAILURE /
  # LAST RECOVERY / RECOVERY COUNT / CURRENT STATE are projected, plus a compact
  # gateway-watchdog last-probe line (its ambiguous streak is the visible alert
  # for the blind-probe failure mode).
  wd_tmp="$(mktemp)"; gw_tmp="$(mktemp)"
  PIG_TIMEOUT=25 pig_ssh 'powershell -NoProfile -Command "Get-Content C:/Users/nolan/.local/share/pigi/pigi-fyd-stack-watchdog.log -Tail 500"' 2>/dev/null | tr -d '\r' > "$wd_tmp" || true
  PIG_TIMEOUT=25 pig_ssh 'powershell -NoProfile -Command "Get-Content C:/Users/nolan/.local/share/pigi/ping-gateway-watchdog.log -Tail 12"' 2>/dev/null | tr -d '\r' > "$gw_tmp" || true
  wd_kv="$(python3 - "$wd_tmp" "$gw_tmp" <<'PYEOF2'
import sys, re
def lines(p):
    try:
        with open(p, encoding='utf-8', errors='replace') as f:
            return [l.rstrip('\n') for l in f if l.strip()]
    except OSError:
        return []
wd_path, gw_path = sys.argv[1], sys.argv[2]
ts_re = re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})')
layer_re = re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) LAYER (\S+) (healthy|UNHEALTHY\s*(\(.*\))?)')
rec_re = re.compile(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (relaunching|restarting) (.*)$')
wl = lines(wd_path)
stamps = [m.group(1) for l in wl for m in [ts_re.match(l)] if m]
unhealthy = [(m.group(1), m.group(2), (m.group(4) or '').strip('()')) for l in wl for m in [layer_re.match(l)] if m and m.group(3).startswith('UNHEALTHY')]
recovs = [(m.group(1), m.group(2) + ' ' + m.group(3)) for l in wl for m in [rec_re.match(l)] if m]
healthy_ts = [m.group(1) for l in wl for m in [layer_re.match(l)] if m and m.group(3) == 'healthy']
bad_minutes = {t[:16] for t, _, _ in unhealthy}
good = [t for t in healthy_ts if t[:16] not in bad_minutes]
out = {}
out['WD_LAST_PROBE'] = max(stamps) if stamps else ''
out['WD_LAST_HEALTHY'] = max(good) if good else ''
out['WD_LAST_FAILURE'] = ('%s %s %s' % (unhealthy[-1][0], unhealthy[-1][1], unhealthy[-1][2])).strip() if unhealthy else ''
out['WD_LAST_RECOVERY'] = ('%s %s' % (recovs[-1][0], recovs[-1][1])) if recovs else ''
out['WD_RECOVERY_COUNT'] = str(len(recovs))
if not stamps:
    out['WD_STATE'] = 'UNKNOWN'
elif max(stamps)[:16] in bad_minutes:
    out['WD_STATE'] = 'DEGRADED'
else:
    out['WD_STATE'] = 'HEALTHY'
gl = lines(gw_path)
amb = 0
for l in reversed(gl):
    if 'ambiguous probe' in l:
        amb += 1
    else:
        break
out['GW_LAST'] = gl[-1] if gl else ''
out['GW_AMBIG_STREAK'] = str(amb)
for k, v in out.items():
    print('%s=%s' % (k, v.replace('\n', ' ')))
PYEOF2
)"
  rm -f "$wd_tmp" "$gw_tmp"
  wd_val() { printf '%s' "$wd_kv" | grep "^$1=" | cut -d= -f2-; }
  wd_last_probe="$(wd_val WD_LAST_PROBE)"; wd_state="$(wd_val WD_STATE)"
  wd_last_healthy="$(wd_val WD_LAST_HEALTHY)"; wd_last_failure="$(wd_val WD_LAST_FAILURE)"
  wd_last_recovery="$(wd_val WD_LAST_RECOVERY)"; wd_recoveries="$(wd_val WD_RECOVERY_COUNT)"
  gw_last="$(wd_val GW_LAST)"; gw_streak="$(wd_val GW_AMBIG_STREAK)"
  if [ -n "$wd_last_probe" ]; then
    wd_epoch="$(TZ=America/Denver date -d "$wd_last_probe" +%s 2>/dev/null || echo 0)"
    wd_age=$(( $(date +%s) - wd_epoch ))
    PIG_WD_ASOF="$(date -u -d "@$wd_epoch" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '')"
  else
    wd_age=999999; PIG_WD_ASOF=''
  fi
  wd_evidence="last_probe=${wd_last_probe:-n/a} last_healthy=${wd_last_healthy:-n/a} last_failure=${wd_last_failure:-n/a} last_recovery=${wd_last_recovery:-n/a} recoveries=${wd_recoveries:-0} state=$wd_state"
  case "$wd_state" in
    HEALTHY) wd_cap="UP"; wd_label="ok" ;;
    DEGRADED) wd_cap="FAIL"; wd_label="bad" ;;
    *) wd_cap="STALE"; wd_label="unknown" ;;
  esac
  if [ "$wd_age" -gt 900 ] && [ "$wd_state" != "UNKNOWN" ]; then
    wd_label="stale"; wd_evidence="$wd_evidence (last probe ${wd_age}s ago)"
  fi
  CHECKS[watchdog_fyd]="$wd_label ($wd_evidence)"
  if [ -n "$gw_last" ]; then
    if [ "$gw_streak" -gt 0 ]; then
      CHECKS[watchdog_gateway]="ambiguous streak: ${gw_streak} consecutive (last='${gw_last}')"
    else
      CHECKS[watchdog_gateway]="ok (last='${gw_last}')"
    fi
  else
    CHECKS[watchdog_gateway]="unknown (no gateway watchdog log data)"
  fi
  wd_cap_state="$wd_cap"; wd_evidence_final="$wd_evidence"
else
  CHECKS[wsl]="skipped (host not up)"
  CHECKS[fyd]="skipped (host not up)"
  DOMAINS[FYD]="UNKNOWN"
fi

# 8. CDP profiles (only meaningful when the host is up; cdp-health.sh handles its own SSH)
if [ "${DOMAINS[HOST]}" = "UP" ]; then
  cdp_out="$("$HERE/../pig-fb/cdp-health.sh" 2>/dev/null || true)"
  cdp_down="$(printf '%s' "$cdp_out" | grep -c ' DOWN' || true)"
  if [ "$cdp_down" -gt 0 ]; then
    CHECKS[cdp]="bad: $(printf '%s' "$cdp_out" | grep ' DOWN' | tr '\n' ';')"
    overall="DEGRADED"
  else
    alive="$(printf '%s' "$cdp_out" | grep -c ' ALIVE' || true)"
    CHECKS[cdp]="ok ${alive}/4 alive"
  fi
else
  CHECKS[cdp]="skipped (ssh down)"
fi

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
tmp_checks="$(mktemp)"
for k in "${!CHECKS[@]}"; do printf '%s\t%s\n' "$k" "${CHECKS[$k]}" >> "$tmp_checks"; done

prev_status="NONE"
[ -f "$STATE_FILE" ] && prev_status="$(python3 -c "import json;print(json.load(open('$STATE_FILE')).get('status','NONE'))" 2>/dev/null || echo UNKNOWN)"

export PIG_HEALTH_CHECKS_FILE="$tmp_checks" PIG_HEALTH_TS="$ts" \
  PIG_HEALTH_STATUS="$overall" PIG_HEALTH_DENVER="$NOW_DENVER" PIG_HEALTH_PREV="$prev_status"
export PIG_HEALTH_STATE_FILE="$STATE_FILE" PIG_HEALTH_LOG_FILE="$LOG_FILE"
export PIG_HEALTH_DOMAINS="HOST=${DOMAINS[HOST]:-UNKNOWN} NETWORK=${DOMAINS[NETWORK]:-UNKNOWN} FYD=${DOMAINS[FYD]:-UNKNOWN}"
export PIG_WD_STATE="${wd_cap_state:-STALE}" PIG_WD_ASOF="${PIG_WD_ASOF:-$ts}" \
  PIG_WD_EVIDENCE="${wd_evidence_final:-no watchdog data (host down or log unreadable)}"
python3 - <<'PYEOF'
import json, os
checks = {}
with open(os.environ['PIG_HEALTH_CHECKS_FILE']) as f:
    for line in f:
        line = line.rstrip('\n')
        if '\t' in line:
            k, v = line.split('\t', 1)
            checks[k] = v
domains = dict(p.split('=', 1) for p in os.environ['PIG_HEALTH_DOMAINS'].split())
ts = os.environ['PIG_HEALTH_TS']

def cap(state, source, evidence):
    return {'state': state, 'as_of': ts, 'source': source, 'evidence': evidence}

def ok_prefix(v):
    return isinstance(v, str) and v.startswith('ok')

capabilities = {
    'machine.reachable': cap(
        'UP' if domains.get('HOST') == 'UP' else ('STALE' if domains.get('HOST') == 'UNKNOWN' else 'FAIL'),
        'pig-health.sh HOST domain (SSH probe)',
        checks.get('ssh', 'n/a')),
    'wsl.ready': cap(
        'UP' if ok_prefix(checks.get('wsl')) else 'FAIL',
        'pig-health.sh WSL probe (uptime)',
        checks.get('wsl', 'n/a')),
    'docker.workload_ready': cap(
        'UP' if (ok_prefix(checks.get('docker')) and ok_prefix(checks.get('postgres'))
                 and ok_prefix(checks.get('gateway'))) else 'FAIL',
        'pig-health.sh docker/postgres/gateway probes',
        'docker=%s postgres=%s gateway=%s' % (
            checks.get('docker', 'n/a'), checks.get('postgres', 'n/a'),
            checks.get('gateway', 'n/a'))),
    'fyd.page_healthy': cap(
        'UP' if domains.get('FYD') == 'UP' else ('FAIL' if domains.get('FYD') in ('DOWN', 'UNREADY') else 'STALE'),
        'pig-health.sh FYD domain (WSL-local + tailnet :3100)',
        checks.get('fyd', 'n/a')),
    'ask.read_path_healthy': cap(
        'UP' if (ok_prefix(checks.get('journal_gateway')) and ok_prefix(checks.get('ask'))) else 'FAIL',
        'pig-health.sh :18199 + Ask FYD probes',
        'journal_gateway=%s ask=%s' % (
            checks.get('journal_gateway', 'n/a'), checks.get('ask', 'n/a'))),
    'watchdog.fyd_stack': {
        'state': os.environ.get('PIG_WD_STATE', 'STALE'),
        'as_of': os.environ.get('PIG_WD_ASOF', ts),
        'source': 'pig-health.sh projection of PigiFydStackWatch durable log',
        'evidence': os.environ.get('PIG_WD_EVIDENCE', 'n/a')},
}
rec = {'ts': ts, 'status': os.environ['PIG_HEALTH_STATUS'],
       'denver_time': os.environ['PIG_HEALTH_DENVER'], 'domains': domains,
       'checks': checks, 'capabilities': capabilities}
with open(os.environ['PIG_HEALTH_STATE_FILE'], 'w') as f:
    json.dump(rec, f, indent=1)
if os.environ['PIG_HEALTH_PREV'] != os.environ['PIG_HEALTH_STATUS']:
    rec['transition'] = os.environ['PIG_HEALTH_PREV'] + ' -> ' + os.environ['PIG_HEALTH_STATUS']
    with open(os.environ['PIG_HEALTH_LOG_FILE'], 'a') as f:
        f.write(json.dumps(rec) + '\n')
PYEOF
rm -f "$tmp_checks"

echo "PIG_HEALTH status=$overall (was $prev_status) denver=$NOW_DENVER"
echo "  domains: HOST=${DOMAINS[HOST]:-UNKNOWN} NETWORK=${DOMAINS[NETWORK]:-UNKNOWN} FYD=${DOMAINS[FYD]:-UNKNOWN}"
for k in ssh wsl docker postgres gateway journal_gateway ask disk win_disk cdp win_boot fyd last_wake reconvergence_note watchdog_fyd watchdog_gateway; do
  [ -n "${CHECKS[$k]:-}" ] && echo "  $k: ${CHECKS[$k]}"
done

[ "$overall" = "UP" ] && exit 0
exit 1
