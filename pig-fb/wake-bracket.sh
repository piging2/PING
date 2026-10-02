# wake-bracket.sh -- library-mode wake-lease bracket for synchronous Pig runners.
#
# (2026-09-27, Nolan's job-scoped wake lease call: every authorized
# long-running Pig job acquires a wake lease before execution and releases it
# in finally/cleanup. Crash-safe expiry is STRUCTURAL, not a code path:
# SetThreadExecutionState lives on the holder thread, and the Windows kernel
# tears the request down when the holder thread/process dies for ANY reason,
# so a dead job cannot pin the machine awake. The timestamped state file
# C:/Users/nolan/.local/share/pigi/run-state/wake-<run_id>.json is the
# per-lease record: run_id (= job), reason, lease_start, lease_end.)
#
# Usage (source AFTER pig-ssh.sh, which provides pig_ssh/pig_scp and $PIG):
#   source "$(dirname "$0")/wake-bracket.sh"
#   REMOTE_PS=$(cat <<EOF
#   $(wake_ps_acquire "ig-$TS" "IG engagement pass (ig-engage.js)")
#   <existing remote body; runs INSIDE the try>
#   $(wake_ps_release "ig-$TS")
#   EOF
#   )
#   REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
#   OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
#
# Contract notes:
# - wake_ps_acquire emits the acquire lines and opens a PowerShell try { .
#   wake_ps_release closes it with } finally { release }. The existing body
#   runs inside the try, so Wake-Release fires on success, worker failure,
#   timeout kill, and remote-session death (the last via kernel thread
#   teardown; the state file then shows acquired=true with NO released flag,
#   which is the recorded evidence of kernel release, not a leak).
# - Wake telemetry goes to the REMOTE stderr ([Console]::Error.WriteLine), so
#   each script's remote stdout contract is unchanged. Pass quiet=1 when the
#   caller merges stderr into stdout (x-engage.sh driver loop).
# - If wake-wrap.ps1 is absent on the Pig, outdated (pre-Reason), or the API
#   call fails, the bracket degrades to today's behavior: the body runs
#   WITHOUT inhibition. It never aborts the run over the lease.
# - Dot-sourcing wake-wrap.ps1 requires -ExecutionPolicy Bypass: always launch
#   the remote block via pig_ssh_wake (which adds it), never a bare powershell.
# - This file NEVER touches OS power policy. No powercfg writes, no sleep
#   timer changes, no Task Scheduler entries. Read-only powercfg /requests is
#   the only powercfg use, for attribution.

WAKE_WRAP_PS='C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'

# wake_ps_acquire <run_id> <reason> [quiet] -- prints the PowerShell acquire
# lines plus the opening "try {". <reason> must not contain a newline; single
# quotes are escaped for PowerShell.
wake_ps_acquire() {
  local run_id="$1" reason="$2" quiet="${3:-0}"
  local ps_reason
  ps_reason=$(printf '%s' "$reason" | sed "s/'/''/g")
  printf "\$wakeRunId = '%s'\n" "$run_id"
  printf "\$wakeOk = \$false\n"
  printf "try { . '%s'; \$wakeOk = Wake-Acquire -RunId \$wakeRunId -Reason '%s' } catch { \$wakeOk = \$false }\n" \
    "$WAKE_WRAP_PS" "$ps_reason"
  if [ "$quiet" != "1" ]; then
    printf "if (-not \$wakeOk) { [Console]::Error.WriteLine('WAKE_ACQUIRE_FAILED run_id=%s (proceeding without inhibition)') }\n" "$run_id"
  fi
  printf "try {\n"
}

# wake_ps_release <run_id> [quiet] -- prints the closing "} finally { release }".
wake_ps_release() {
  local run_id="$1" quiet="${2:-0}"
  printf "} finally {\n"
  printf "if (\$wakeOk) { Wake-Release -RunId \$wakeRunId }\n"
  if [ "$quiet" != "1" ]; then
    printf "[Console]::Error.WriteLine('WAKE_RELEASED run_id=%s')\n" "$run_id"
  fi
  printf "}\n"
}

# pig_ssh_wake <base64-encoded powershell> -- like pig_ssh, but launches the
# remote powershell with -ExecutionPolicy Bypass (required for dot-sourcing
# wake-wrap.ps1; a plain -NoProfile session silently refuses the dot-source).
pig_ssh_wake() {
  pig_ssh "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $1"
}

# wake_wrap_deploy -- scp the canonical wake-wrap.ps1 to the Pig, pinned per
# dispatch like the worker .js files. Warn-and-proceed on failure: the bracket
# degrades gracefully to no-inhibition (today's behavior), so a failed deploy
# must not fail the run closed. Returns 0 either way.
wake_wrap_deploy() {  # $1 = caller name (for the warning line)
  local caller="${1:-unknown}"
  pig_scp "$(dirname "${BASH_SOURCE[0]}")/wake-wrap.ps1" "$PIG:$WAKE_WRAP_PS" >/dev/null 2>&1 || \
    printf '[%s] WARNING: wake-wrap.ps1 scp failed; run proceeds without wake lease\n' "$caller" >&2
  return 0
}
