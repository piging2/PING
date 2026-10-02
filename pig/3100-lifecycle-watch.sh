#!/bin/bash
# 3100-lifecycle-watch.sh -- death-instrumentation observer for :3100 (FYD served
# surface) and :18199 (journal gateway). READ-ONLY: never restarts, kills, or
# reconfigures anything. Appends evidence to /home/nolan/3100-lifecycle.log so
# the NEXT unexpected death emits a DEATH CERTIFICATE with: PID, PPID + full
# ancestor chain, process start time, event time, launch command hash, HEAD/SHA
# (at launch and at death), port ownership, Windows process/boot context
# (best effort), WSL lifecycle, Docker lifecycle, dmesg oom/kill tail.
#
# Single instance via pidfile. Managed by /home/nolan/start-3100.sh (the ONE
# blessed launch path). Started only as:
#   setsid bash /home/nolan/3100-lifecycle-watch.sh >>/home/nolan/3100-lifecycle.log 2>&1 < /dev/null &
set -u

LOG=/home/nolan/3100-lifecycle.log
PIDFILE=/home/nolan/3100-lifecycle-watch.pid
INTERVAL=10
REPO=/home/nolan/projects/ping
# Canonical launch command whose hash binds a death to the blessed path.
LAUNCH_CMD='cd /home/nolan/projects/ping && exec npm start -- -p 3100'
LAUNCH_HASH=$(printf '%s' "$LAUNCH_CMD" | sha256sum | cut -d' ' -f1)

stamp() { date '+%Y-%m-%d %H:%M:%S %Z'; }

# Single-instance guard.
if [ -f "$PIDFILE" ]; then
  oldpid=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then
    echo "[$(stamp)] WATCHER-ALREADY-RUNNING pid=$oldpid; exiting" >>"$LOG"
    exit 0
  fi
fi
echo $$ >"$PIDFILE"

port_pids() { # $1 = port -> space-separated pids or empty
  fuser "$1/tcp" 2>/dev/null | sed 's/^[^:]*: *//' | tr -s ' ' || true
}

ancestor_chain() { # $1 = pid -> prints chain lines
  local ap="$1"
  for _ in $(seq 1 10); do
    local pp
    pp=$(ps -o ppid= -p "$ap" 2>/dev/null | tr -d ' ')
    if [ -z "$pp" ] || [ "$pp" = "0" ] || [ "$pp" = "1" ]; then
      echo "  chain: $ap <- $pp (top)"; break
    fi
    local cmd
    cmd=$(ps -o cmd= -p "$pp" 2>/dev/null | cut -c1-140)
    echo "  chain: $ap <- $pp :: $cmd"
    ap="$pp"
  done
}

proc_record() { # $1 = pid, $2 = port -> full identity record
  local p="$1" port="$2"
  echo "  pid=$p ppid=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ') lstart='$(ps -o lstart= -p "$p" 2>/dev/null)' etime=$(ps -o etime= -p "$p" 2>/dev/null | tr -d ' ')"
  echo "  cmd: $(ps -o cmd= -p "$p" 2>/dev/null | cut -c1-200)"
  ancestor_chain "$p"
  echo "  launch_hash=$LAUNCH_HASH head=$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo unknown) dirty=$(git -C "$REPO" status --porcelain 2>/dev/null | wc -l)"
}

windows_context() { # best effort, only called on death events
  echo "  --- windows context (best effort) ---"
  timeout 20 /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('yyyy-MM-dd HH:mm:ss')" 2>/dev/null | sed 's/^/  win_last_boot: /' || echo "  win_last_boot: UNAVAILABLE"
  timeout 15 /mnt/c/Windows/System32/tasklist.exe /FI "IMAGENAME eq node.exe" 2>/dev/null | head -8 | sed 's/^/  /' || echo "  win_node_tasks: UNAVAILABLE"
}

docker_context() {
  echo "  --- docker lifecycle ---"
  echo "  wsl_uptime_since: $(uptime -s 2>/dev/null || echo unknown)"
  docker info --format '  docker_server={{.ServerVersion}} containers={{.Containers}} running={{.ContainersRunning}}' 2>&1 | head -2 || echo "  docker: DOWN"
  echo "  --- dmesg oom/kill tail ---"
  dmesg 2>/dev/null | grep -i -e oom -e "killed process" | tail -5 | sed 's/^/  /' || true
}

death_certificate() { # $1 = port, $2 = last pid record file
  local port="$1" rec="$2"
  {
    echo "[$(stamp)] DEATH-CERTIFICATE port=$port"
    echo "  event: unexpected listener loss (watcher did NOT restart anything)"
    [ -f "$rec" ] && sed 's/^/  last_known: /' "$rec" || echo "  last_known: UNAVAILABLE"
    echo "  port_owner_now: $(ss -tlnp 2>/dev/null | grep ":$port" | head -2 || echo none)"
    echo "  head_now=$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo unknown)"
    windows_context
    docker_context
    echo "  END DEATH-CERTIFICATE"
  } >>"$LOG" 2>&1
}

snapshot_listener() { # $1 = port, $2 = pid -> writes record file, returns path
  local rec="/tmp/lifecycle-$1-$2.rec"
  { echo "port=$1"; proc_record "$2" "$1"; } >"$rec" 2>&1
  echo "$rec"
}

echo "[$(stamp)] WATCHER-START pid=$$ ppid=$PPID launch_hash=$LAUNCH_HASH" >>"$LOG"

declare -A KNOWN_RECS  # key "port:pid" -> record file
declare -A KNOWN_PIDS  # key port -> "pid pid..."

snapshot_all() {
  local label="$1"
  {
    echo "[$(stamp)] $label"
    for port in 3100 18199; do
      echo "  port $port pids: [$(port_pids "$port" | tr '\n' ' ')]"
      echo "  port $port owner: $(ss -tlnp 2>/dev/null | grep ":$port" | head -1 || echo none)"
    done
  } >>"$LOG" 2>&1
}
snapshot_all "WATCHER-INIT baseline"

while true; do
  sleep "$INTERVAL"
  for port in 3100 18199; do
    cur=$(port_pids "$port")
    prev="${KNOWN_PIDS[$port]:-}"
    if [ "$cur" != "$prev" ]; then
      if [ -z "$prev" ] && [ -n "$cur" ]; then
        for p in $cur; do
          rec=$(snapshot_listener "$port" "$p")
          KNOWN_RECS["$port:$p"]="$rec"
          echo "[$(stamp)] LISTENER_APPEARED port=$port pid=$p rec=$rec" >>"$LOG"
        done
      elif [ -n "$prev" ] && [ -z "$cur" ]; then
        for p in $prev; do
          death_certificate "$port" "${KNOWN_RECS["$port:$p"]:-}"
          unset 'KNOWN_RECS["$port:$p"]'
        done
      else
        # PID set changed (restart or partial): certify the gone ones, record the new.
        for p in $prev; do
          case " $cur " in *" $p "*) ;; *) death_certificate "$port" "${KNOWN_RECS["$port:$p"]:-}"; unset 'KNOWN_RECS["$port:$p"]';; esac
        done
        for p in $cur; do
          case " $prev " in *" $p "*) ;; *) rec=$(snapshot_listener "$port" "$p"); KNOWN_RECS["$port:$p"]="$rec"; echo "[$(stamp)] LISTENER_APPEARED port=$port pid=$p rec=$rec" >>"$LOG";; esac
        done
      fi
      KNOWN_PIDS["$port"]="$cur"
    fi
  done
done
