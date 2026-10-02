#!/bin/bash
# mirror-workspace-to-pig.sh: one-way delta mirror of the agent-ops workspace to the Pig.
# Runs from cron (workspace-mirror-to-pig, 6h, executor timeout 1800s). Quiet on
# success; logs to ~/workspace/pig/mirror.log.
#
# Operational design (2026-09-24, after three rsync-255 failures):
#  - Chunked: one rsync invocation per top-level directory plus one root-files
#    chunk, run sequentially. Each chunk is bounded well under the executor
#    timeout, so a killed chunk resumes via --partial/--append-verify instead
#    of restarting a multi-GB whole-tree transfer from zero.
#  - The exit line is guaranteed: trap TERM/INT, kill the in-flight rsync,
#    record the outcome. No more monitoring blind spots when the executor
#    SIGTERMs the script.
#  - Fail fast on silent tunnel death: pig-rsync.sh sets ServerAliveInterval=30
#    / ServerAliveCountMax=3, so a dead CONNECT tunnel is detected in ~90s
#    instead of hanging until the scheduler kills the run.
#  - On a tunnel failure (rsync 10, 12, or 255) remaining chunks are aborted
#    and a RETRY_RECOMMENDED=<code> line is logged; the cron job body
#    schedules a one-shot catch-up run ~30 minutes out (not the full 6h wait).
#
# Env overrides (tests only; cron uses the defaults):
#   MIRROR_SRC, MIRROR_DEST, MIRROR_LOG
set -u
SRC="${MIRROR_SRC:-/home/hatch/workspace/}"
DEST="${MIRROR_DEST:-pigwsl:/home/nolan/workspace/}"
RSH="/home/hatch/workspace/pig/pig-rsync.sh"
LOG="${MIRROR_LOG:-/home/hatch/workspace/pig/mirror.log}"
# 50% of the 1800s executor timeout: no chunk may take this long.
CHUNK_BUDGET_SECS=900

RSYNC_FLAGS=(-az --delete --partial --append-verify --timeout=120 -e "$RSH")

CHILD_PID=""
SIGNALED=""
OVERALL_RC=0
CHUNKS_OK=0
CHUNKS_FAILED=0

utc() { date -u +%FT%TZ; }

log() { echo "$*" >> "$LOG"; }

write_exit_line() {
  local rc="$1"
  log "exit=$rc $(utc)${SIGNALED:+ ($SIGNALED)}"
}

on_signal() {  # $1 = signal name
  SIGNALED="script killed by $1 before writing exit line"
  log "$SIGNALED $(utc)"
  if [ -n "$CHILD_PID" ] && kill -0 "$CHILD_PID" 2>/dev/null; then
    kill -TERM "$CHILD_PID" 2>/dev/null
    wait "$CHILD_PID" 2>/dev/null
  fi
  CHILD_PID=""
  case "$1" in
    INT) write_exit_line 130 ;;
    *)   write_exit_line 143 ;;
  esac
  exit "$([ "$1" = INT ] && echo 130 || echo 143)"
}
trap 'on_signal TERM' TERM
trap 'on_signal INT' INT

# run_chunk <label> <rsync args...>: one bounded rsync invocation.
# Runs rsync in the background and waits on it so the TERM/INT trap can fire
# while a transfer is in flight (a foreground rsync would defer the trap).
# rsync codes that mean the SSH tunnel died, not a file problem:
#  10 = error in socket I/O, 12 = error in rsync protocol data stream,
# 255 = unexplained error (ssh-level failure, e.g. client_loop EPIPE).
# On any of these the remaining chunks are aborted and a catch-up retry is
# recommended; every chunk opens its own ssh connection, so hammering a dead
# proxy 177 more times buys nothing.
is_tunnel_rc() {
  case "$1" in
    10|12|255) return 0 ;;
    *)         return 1 ;;
  esac
}

abort_tunnel() {  # $1 = chunk label, $2 = rc
  log "tunnel failure ($2) on chunk $1; aborting remaining chunks"
  log "RETRY_RECOMMENDED=$2 $(utc)"
  write_exit_line "$OVERALL_RC"
  exit "$OVERALL_RC"
}

run_chunk() {
  local label="$1"; shift
  local start end elapsed rc
  start=$(date +%s)
  log "chunk start: $label $(utc)"
  rsync "${RSYNC_FLAGS[@]}" "$@" < /dev/null >> "$LOG" 2>&1 &
  CHILD_PID=$!
  wait "$CHILD_PID"; rc=$?
  CHILD_PID=""
  end=$(date +%s); elapsed=$((end - start))
  log "chunk done: $label rc=$rc secs=$elapsed"
  if [ "$elapsed" -ge "$CHUNK_BUDGET_SECS" ]; then
    log "chunk WARNING: $label took ${elapsed}s, at/over the ${CHUNK_BUDGET_SECS}s budget"
  fi
  if [ "$rc" -eq 0 ]; then
    CHUNKS_OK=$((CHUNKS_OK + 1))
  else
    CHUNKS_FAILED=$((CHUNKS_FAILED + 1))
    if [ "$OVERALL_RC" -eq 0 ]; then OVERALL_RC=$rc; fi
  fi
  return "$rc"
}

log "=== mirror run $(utc) (chunked) ==="

# Chunk 1: top-level regular files and symlinks only. Filter rules scope both
# the transfer and --delete to the top level: '+ /*' includes every top-level
# entry, '- */' then excludes directories (their contents stay untouched and
# are protected from deletion), '- *' excludes everything deeper. (An earlier
# --files-from attempt was dropped: --delete does not delete stale receiver
# files when the transfer is a file list rather than directory sync.)
run_chunk "__root_files__" --include='/*' --exclude='*/' --exclude='*' "$SRC" "$DEST"
rc=$?
if is_tunnel_rc "$rc"; then
  abort_tunnel "__root_files__" "$rc"
fi

# Chunks 2..N: one rsync per top-level directory. Trailing slashes keep
# --delete scoped to that subdirectory (same net effect as the old whole-tree
# --delete, per directory).
while IFS= read -r -d '' d; do
  base="$(basename "$d")"
  run_chunk "$base" "$d/" "$DEST$base/"
  rc=$?
  if is_tunnel_rc "$rc"; then
    abort_tunnel "$base" "$rc"
  fi
done < <(find "$SRC" -mindepth 1 -maxdepth 1 -type d -print0 | LC_ALL=C sort -z)

log "chunks ok=$CHUNKS_OK failed=$CHUNKS_FAILED"
write_exit_line "$OVERALL_RC"
exit "$OVERALL_RC"
