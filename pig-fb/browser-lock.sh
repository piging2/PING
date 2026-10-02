#!/bin/bash
# browser-lock.sh -- mutual exclusion for the Pig's shared headed-Chrome profiles.
#
# (2026-09-21, FL-20260921-015/016.) Two scheduled workers once shared one
# browser profile with no coordination: the Instagram engagement pass and the
# Instagram unfollow worker both drove the ig-profile Chrome (:9226), and the
# Facebook engagement pass, Facebook unfollow, and Meta AI all share the
# fb-profile Chrome (:9223). A second worker attaching mid-pass can wedge,
# relaunch, or otherwise disturb the first worker's CDP pages. Workers must
# never disturb a browser context they do not own; with this lock, two
# scheduled workers can never hold the same profile at once.
#
# Usage: source this file near the top of a runner (BEFORE the capability
# gate, ensure-cdp, or any scp/Pig work), then:
#
#   source "$(dirname "$0")/browser-lock.sh"
#   browser_lock_acquire ig "run_ig_pass.sh" || exit 2
#
# profile: ig  -> ig-profile Chrome  (CDP :9226)
#          fb  -> fb-profile Chrome  (CDP :9223, also used by Meta AI)
#
# On success (return 0) the calling shell holds an exclusive flock on the
# profile lock file for the rest of its lifetime. The lock is tied to the
# open file descriptor: the kernel releases it when the shell exits or dies,
# so no stale lock is possible and no explicit release call is needed.
# On contention (return 2) a JSON {"ok":false,"infra":"browser_locked",...}
# is printed to stdout and NOTHING was started: the caller must exit before
# touching the browser. Fail closed.
#
# set -u safe. Do not serialize unrelated profiles: ig and fb are independent.

# (FB_BROWSER_LOCK_DIR is a test seam; production uses pig-fb/.locks.)
BROWSER_LOCK_DIR="${FB_BROWSER_LOCK_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.locks}"
_BROWSER_LOCK_FD=""

browser_lock_acquire() {
  local profile="${1:-}" owner="${2:-unknown}"
  if [ "$profile" != "ig" ] && [ "$profile" != "fb" ]; then
    echo "browser_lock_acquire: unknown profile '$profile' (want ig|fb)" >&2
    return 2
  fi
  mkdir -p "$BROWSER_LOCK_DIR" || return 2
  local lockfile="$BROWSER_LOCK_DIR/${profile}-chrome.lock"
  local holderfile="$BROWSER_LOCK_DIR/${profile}-chrome.holder"
  # Open the lock file on a dedicated fd that stays open in the CALLER's
  # shell (this file is sourced, so the fd outlives this function). The
  # kernel drops the flock when the shell exits for any reason.
  eval "exec {_BROWSER_LOCK_FD}>\"\$lockfile\"" || return 2
  if ! flock -n "$_BROWSER_LOCK_FD"; then
    local holder="unknown"
    [ -f "$holderfile" ] && holder="$(cat "$holderfile" 2>/dev/null || echo unknown)"
    printf '{"ok":false,"infra":"browser_locked","profile":"%s","holder":"%s","note":"Another worker holds the %s-profile Chrome; not starting, to avoid cross-worker browser interference."}\n' \
      "$profile" "$holder" "$profile"
    eval "exec ${_BROWSER_LOCK_FD}>&-"
    _BROWSER_LOCK_FD=""
    return 2
  fi
  printf '%s pid=%s at=%s\n' "$owner" "$$" "$(date -u +%FT%TZ)" > "$holderfile" 2>/dev/null || true
  return 0
}
