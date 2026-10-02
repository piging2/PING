#!/bin/bash
# 3100-lifecycle-watch.sh -- READ-ONLY observer for the :3100 served surface.
# P1-REL-01 (2026-09-28): five unexplained SIGKILLs of the :3100 node process.
# This watcher NEVER restarts, kills, or reconfigures anything. It only appends
# evidence to /home/nolan/3100-lifecycle.log so the next death (or next launch)
# is captured with: PID, PPID + full ancestor chain (launcher), process start
# time, resource state, and dmesg tail. Goal: KILLER IDENTIFIED or FAILURE CLASS
# NARROWED WITH EVIDENCE. "Preserve evidence before respawning."
#
# DRAFT -- NOT STARTED. Start only on explicit lane authorization, via:
#   setsid bash /home/nolan/3100-lifecycle-watch.sh >>/home/nolan/3100-lifecycle.log 2>&1 < /dev/null &
# (stdio on files, non-PTY, matching the :3100 restart protocol.)
set -u

LOG=/home/nolan/3100-lifecycle.log
INTERVAL=10

stamp() { date '+%Y-%m-%d %H:%M:%S %Z'; }

snapshot() {
  local label="$1"; shift
  {
    echo "[$(stamp)] $label"
    echo "  pids_3100: $(fuser 3100/tcp 2>/dev/null | sed 's/^[^:]*: *//' | tr -s ' ' ',' || echo none)"
    echo "  --- ps (pid,ppid,lstart,etime,cmd) for :3100 tree ---"
    for p in $(fuser 3100/tcp 2>/dev/null | sed 's/^[^:]*: *//'); do
      ps -o pid=,ppid=,lstart=,etime=,cmd= -p "$p" 2>/dev/null | sed 's/^/  /'
      echo "  --- ancestor chain of $p ---"
      ap="$p"
      for _ in $(seq 1 8); do
        pp=$(ps -o ppid= -p "$ap" 2>/dev/null | tr -d ' ')
        [ -z "$pp" ] || [ "$pp" = "0" ] || [ "$pp" = "1" ] && { echo "  $ap <- $pp (top)"; break; }
        cmd=$(ps -o cmd= -p "$pp" 2>/dev/null | cut -c1-120)
        echo "  $ap <- $pp :: $cmd"
        ap="$pp"
      done
    done
    echo "  --- resources ---"
    free -m | sed 's/^/  /'
    echo "  load: $(cut -d' ' -f1-3 /proc/loadavg) uptime_s: $(cut -d. -f1 /proc/uptime)"
    echo "  --- dmesg tail (oom/kill) ---"
    dmesg 2>/dev/null | grep -i -e oom -e "killed process" | tail -5 | sed 's/^/  /'
    echo "  --- ss :3100 ---"
    ss -ltnp 2>/dev/null | grep ':3100' | sed 's/^/  /' || echo "  (no :3100 listener)"
  } >>"$LOG" 2>&1
}

echo "[$(stamp)] WATCHER-START pid=$$ ppid=$PPID user=$(whoami)" >>"$LOG"
snapshot "WATCHER-INIT baseline"

prev_pids=""
while true; do
  sleep "$INTERVAL"
  cur_pids=$(fuser 3100/tcp 2>/dev/null | sed 's/^[^:]*: *//' | tr -s ' ' | tr -d ' ' || true)
  if [ "$cur_pids" != "$prev_pids" ]; then
    if [ -z "$prev_pids" ] && [ -n "$cur_pids" ]; then
      snapshot "EVENT LISTENER_APPEARED prev=[none] cur=[$cur_pids]"
    elif [ -n "$prev_pids" ] && [ -z "$cur_pids" ]; then
      snapshot "EVENT LISTENER_GONE prev=[$prev_pids] cur=[none] -- evidence preserved, NOT restarting"
    else
      snapshot "EVENT PID_CHANGED prev=[$prev_pids] cur=[$cur_pids]"
    fi
    prev_pids="$cur_pids"
  fi
done
