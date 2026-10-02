#!/usr/bin/env bash
#
# capture-evidence.sh - P0-8 on-demand incident evidence capture
#
# Run ON THE HOST where the containers run (e.g. the Oracle host), as a user
# with docker access (root or docker group; sudo is used opportunistically).
#
# Purpose: when a correlated stop of critical containers is detected, preserve
# every available piece of evidence to timestamped files BEFORE any recovery
# action runs. Evidence is volatile: docker events live in an in-memory ring
# buffer and die with the daemon; journald rotates; dmesg is a ring buffer.
# Run this script FIRST, recover SECOND, attribute THIRD.
#
# This script is READ-ONLY. It never runs prune, rm, rmi, volume rm, network
# rm, kill, stop, restart, or any other destructive or state-changing command.
# It does not install anything and does not start any daemon.
#
# Usage:
#   ./capture-evidence.sh --since "2026-09-20T00:45:00Z" [--until "...Z"] \
#       [--out DIR] [--targets "ping-gateway,ping-postgres"]
#
#   --since   Start of the incident window (UTC ISO 8601 preferred).
#             Default: 45 minutes before invocation.
#   --until   End of the incident window. Default: invocation time.
#   --out     Output directory. Default: ./incident-evidence-<UTC timestamp>.
#   --targets Comma-separated container names to inspect in depth.
#             Default: ping-gateway,ping-postgres
#
# Exit codes: 0 = capture completed (individual sections may be marked MISSING
# in the manifest if a source was unavailable); 2 = usage error.

set -u

SCRIPT_VERSION="1.0.0"

SINCE=""
UNTIL=""
OUT=""
TARGETS="ping-gateway,ping-postgres"

usage() {
  sed -n '2,/^# Exit codes/p' "$0" | sed 's/^# \?//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --since)   SINCE="${2:?--since needs a value}"; shift 2 ;;
    --until)   UNTIL="${2:?--until needs a value}"; shift 2 ;;
    --out)     OUT="${2:?--out needs a value}"; shift 2 ;;
    --targets) TARGETS="${2:?--targets needs a value}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
[ -z "$OUT" ] && OUT="./incident-evidence-${STAMP}"
if [ -z "$SINCE" ]; then
  SINCE="$(date -u -d '45 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-45M +%Y-%m-%dT%H:%M:%SZ)"
fi
[ -z "$UNTIL" ] && UNTIL="$NOW_UTC"

mkdir -p "$OUT"
MANIFEST="$OUT/MANIFEST.txt"

# ---------------------------------------------------------------- helpers

log() { printf '%s\n' "$*" | tee -a "$MANIFEST"; }
note_missing() { printf 'MISSING: %s\n' "$*" | tee -a "$MANIFEST"; }

# Run a command, saving stdout (and stderr) to a file. Never fails the script.
capture() {
  # $1 = output file (relative to $OUT), rest = command
  local outfile="$OUT/$1"; shift
  mkdir -p "$(dirname "$outfile")"
  if "$@" >"$outfile" 2>"$outfile.stderr"; then
    printf 'OK: %s\n' "$outfile" >>"$MANIFEST"
  else
    local rc=$?
    printf 'FAILED(rc=%s): %s (see %s.stderr)\n' "$rc" "$outfile" "$outfile" >>"$MANIFEST"
  fi
}

# Use sudo only if we are not root and sudo exists and works non-interactively.
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  SUDO="sudo"
fi

DOCKER_OK=0
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  DOCKER_OK=1
fi

JOURNAL_OK=0
if command -v journalctl >/dev/null 2>&1; then
  JOURNAL_OK=1
fi

# ---------------------------------------------------------------- manifest
{
  echo "capture-evidence.sh v${SCRIPT_VERSION}"
  echo "invoked_utc=${NOW_UTC}"
  echo "window_since=${SINCE}"
  echo "window_until=${UNTIL}"
  echo "outdir=${OUT}"
  echo "targets=${TARGETS}"
  echo "host=$(hostname 2>/dev/null || echo unknown)"
  echo "kernel=$(uname -a 2>/dev/null || echo unknown)"
  echo "invoked_by=$(whoami 2>/dev/null || echo unknown) uid=$(id -u 2>/dev/null || echo ?)"
  echo "sudo_used=${SUDO:-none}"
  echo "docker_available=${DOCKER_OK}"
  echo "journalctl_available=${JOURNAL_OK}"
} >"$MANIFEST"
echo "--- captures ---" >>"$MANIFEST"

log "Preserving evidence for window ${SINCE} .. ${UNTIL} into ${OUT}"
log "DO NOT run any recovery action until this script completes."

# ---------------------------------------------------------------- host state
capture 00-host/uptime.txt            uptime
capture 00-host/who.txt               who -a
capture 00-host/last.txt              last -x -n 50
capture 00-host/dmesg.txt             $SUDO dmesg -T
capture 00-host/loadavg.txt           cat /proc/loadavg
capture 00-host/meminfo.txt           cat /proc/meminfo

# ---------------------------------------------------------------- docker
if [ "$DOCKER_OK" -eq 1 ]; then
  capture 10-docker/version.txt        docker version
  capture 10-docker/info.txt           docker info
  capture 10-docker/ps-all.txt         docker ps -a --no-trunc
  capture 10-docker/images.txt         docker images --no-trunc
  capture 10-docker/network-ls.txt     docker network ls
  capture 10-docker/compose-ls.txt     docker compose ls
  capture 10-docker/df.txt             docker system df
  # Bounded event window. NOTE: docker events is a live stream; --until makes
  # it terminate. Pre-window events are gone if the daemon restarted.
  capture 20-events/docker-events.txt \
      docker events --since "$SINCE" --until "$UNTIL"
  capture 20-events/docker-events-containers.txt \
      docker events --since "$SINCE" --until "$UNTIL" --filter type=container
  capture 20-events/docker-events-network.txt \
      docker events --since "$SINCE" --until "$UNTIL" --filter type=network
  capture 20-events/docker-events-daemon.txt \
      docker events --since "$SINCE" --until "$UNTIL" --filter type=daemon
  # Per-container state: transitions, exit codes, OOM flag, restart policy.
  OLD_IFS="$IFS"; IFS=','
  for t in $TARGETS; do
    IFS="$OLD_IFS"
    t="$(printf '%s' "$t" | tr -d ' ')"
    capture "30-containers/${t}-inspect.txt" \
        docker inspect "$t"
    capture "30-containers/${t}-logs.txt" \
        docker logs --since "$SINCE" --until "$UNTIL" --timestamps "$t"
    IFS=','
  done
  IFS="$OLD_IFS"
  # Networks: which containers are (still) attached right now.
  for n in $(docker network ls --format '{{.Name}}' 2>/dev/null); do
    capture "40-networks/net-${n}-inspect.txt" docker network inspect "$n"
  done
else
  note_missing "docker CLI or daemon unreachable; all 10/20/30/40-docker sections skipped"
fi

# ---------------------------------------------------------------- daemon + system journals
if [ "$JOURNAL_OK" -eq 1 ]; then
  capture 50-journal/docker-service.txt \
      $SUDO journalctl -u docker.service --since "$SINCE" --until "$UNTIL" --no-pager
  capture 50-journal/containerd.txt \
      $SUDO journalctl -u containerd.service --since "$SINCE" --until "$UNTIL" --no-pager
  capture 50-journal/kernel.txt \
      $SUDO journalctl -k --since "$SINCE" --until "$UNTIL" --no-pager
  capture 50-journal/kernel-oom.txt \
      sh -c "$SUDO journalctl -k --since \"$SINCE\" --until \"$UNTIL\" --no-pager | grep -i -E 'oom|out of memory' || true"
  capture 50-journal/system.txt \
      $SUDO journalctl --since "$SINCE" --until "$UNTIL" --no-pager -p info
  capture 50-journal/sshd.txt \
      $SUDO journalctl _SYSTEMD_UNIT=sshd.service --since "$SINCE" --until "$UNTIL" --no-pager
  capture 50-journal/sudo.txt \
      $SUDO journalctl _COMM=sudo --since "$SINCE" --until "$UNTIL" --no-pager
  capture 50-journal/boot-list.txt \
      $SUDO journalctl --list-boots --no-pager
  capture 50-journal/cron.txt \
      $SUDO journalctl _COMM=cron --since "$SINCE" --until "$UNTIL" --no-pager
else
  note_missing "journalctl not available; systemd journal sections skipped"
fi

# dmesg OOM scan regardless of journald
capture 55-kernel/dmesg-oom.txt \
    sh -c "$SUDO dmesg | grep -i -E 'oom|out of memory' || true"

# ---------------------------------------------------------------- auth logs (distro-dependent)
if [ -f /var/log/auth.log ]; then
  capture 60-auth/auth.log.txt \
      sh -c "$SUDO grep -a . /var/log/auth.log | tail -n 2000 || true"
elif [ -f /var/log/secure ]; then
  capture 60-auth/secure.txt \
      sh -c "$SUDO grep -a . /var/log/secure | tail -n 2000 || true"
else
  note_missing "no /var/log/auth.log or /var/log/secure found"
fi
if [ -f /var/log/auth.log.1 ]; then
  capture 60-auth/auth.log.1-tail.txt \
      sh -c "$SUDO tail -n 500 /var/log/auth.log.1 || true"
fi

# ---------------------------------------------------------------- scheduling / deployment automation
capture 70-scheduler/root-crontab.txt   sh -c "$SUDO crontab -l 2>&1 || true"
capture 70-scheduler/user-crontab.txt   sh -c "crontab -l 2>&1 || true"
capture 70-scheduler/cron-d.txt         sh -c "$SUDO ls -la /etc/cron.d/ /etc/cron.daily/ 2>&1 || true"
if [ "$JOURNAL_OK" -eq 1 ]; then
  capture 70-scheduler/timers.txt       $SUDO systemctl list-timers --all --no-pager
fi
# Compose project files: list only (read-only). Helps show whether a compose
# project was recently touched. Add project paths via --targets if needed.
capture 70-scheduler/compose-files.txt \
    sh -c "find /opt/ping /home /root /srv -maxdepth 6 \\( -name 'docker-compose*.yml' -o -name 'docker-compose*.yaml' -o -name 'compose.y*ml' \\) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -50 || true"

# ---------------------------------------------------------------- checksums + close
(
  cd "$OUT" || exit 1
  find . -type f ! -name 'MANIFEST.txt' ! -name 'sha256sums.txt' -print0 \
    | sort -z | xargs -0 sha256sum > sha256sums.txt 2>/dev/null || true
)
{
  echo "--- close ---"
  echo "completed_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "files=$(find "$OUT" -type f | wc -l)"
  echo "sha256sums=sha256sums.txt"
  echo "READ-ONLY GUARANTEE: this script issued no prune/rm/kill/stop/restart."
} >>"$MANIFEST"

log "Evidence capture complete: ${OUT}"
log "Next step per runbook: copy ${OUT} off-host, then begin RECOVERY."
