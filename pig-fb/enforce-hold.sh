#!/bin/bash
# enforce-hold.sh <surface> -- push an owner-hold stop to the Pig.
#
# Called by set-hold.py (best-effort, detached, timeout-guarded) after a hold
# is recorded in holds.json. Does two things:
#   1. Overwrites every <job>.hold.json sentinel in the surface's Pig inbox
#      with {"held":true}, so in-flight workers see the hold before their
#      next action and stop with zero new external effects.
#   2. Kills in-flight worker processes for the surface, so a worker sleeping
#      between actions (60-120s pacing) does not resume after the hold.
#
# Best-effort: NEVER fails the hold. holds.json is the authority; this is
# just the enforcement arm. All errors are swallowed, exit is always 0.
#
# Usage: enforce-hold.sh facebook|instagram|threads|tiktok|linkedin|x
set -u
SURFACE="${1:-}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Surface -> Pig engage dir + worker command-line match patterns.
case "$SURFACE" in
  facebook)  PIGDIR='C:/Users/nolan/.local/share/pigi/fb-engage'; MATCH='fb-engage/engage.js|fb-engage/fb-unfollow.js|fb-engage/page-post.js' ;;
  instagram) PIGDIR='C:/Users/nolan/.local/share/pigi/ig-engage'; MATCH='ig-engage/ig-engage.js|ig-engage/ig-unfollow.js' ;;
  threads)   PIGDIR='C:/Users/nolan/.local/share/pigi/ig-engage'; MATCH='ig-engage/th-engage.js' ;;
  tiktok)    PIGDIR='C:/Users/nolan/.local/share/pigi/tt-engage'; MATCH='tt-engage/tk-engage.js' ;;
  linkedin)  PIGDIR='C:/Users/nolan/.local/share/pigi/li-engage'; MATCH='li-engage/engage.js' ;;
  x)         PIGDIR=''; MATCH='x-like-run.ps1|x-comment-run.ps1|x-follow-run.ps1' ;;
  *) echo "enforce-hold.sh: unknown surface '$SURFACE'" >&2; exit 0 ;;
esac

SENTINEL_JSON="{\"held\":true,\"surface\":\"$SURFACE\",\"reason\":\"owner hold enforced\",\"ts\":\"$TS\"}"

# Build the PowerShell: flip sentinels, then kill matching worker processes.
# Single-quoted heredoc would not expand; we build via printf to keep the
# JSON intact and base64 the whole thing (quote-free transport).
PS_BODY=$(cat <<PS_EOF
\$sentinel = '$SENTINEL_JSON'
\$inbox = '$PIGDIR/inbox'
if (\$inbox -ne '' -and (Test-Path \$inbox)) {
  Get-ChildItem -Path \$inbox -Filter '*.hold.json' -ErrorAction SilentlyContinue | ForEach-Object {
    try { Set-Content -Path \$_.FullName -Value \$sentinel -ErrorAction Stop } catch {}
  }
}
\$patterns = '$MATCH'.Split('|')
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='powershell.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  \$cl = \$_.CommandLine
  foreach (\$p in \$patterns) {
    if (\$cl -and \$cl.Contains(\$p)) { try { \$_.Terminate() | Out-Null } catch {}; break }
  }
}
PS_EOF
)
PS_B64=$(printf '%s' "$PS_BODY" | iconv -t UTF-16LE | base64 -w0)

# Best-effort: short timeout, all output discarded, always exit 0.
source "$(dirname "$0")/pig-ssh.sh" 2>/dev/null || true
if command -v pig_ssh >/dev/null 2>&1; then
  PIG_TIMEOUT=20 pig_ssh "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $PS_B64" >/dev/null 2>&1 || true
fi
exit 0
