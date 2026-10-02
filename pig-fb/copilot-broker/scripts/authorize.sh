#!/bin/bash
# AUTHORIZE COPILOT - the one human step.
#
# Run on the Pig's WSL:  bash ~/copilot-broker/scripts/authorize.sh [identity_id]
#
# PRIMARY PATH (browser OAuth in a FRESH isolated session, no codes to type):
#   1. Starts `copilot login --web-flow` in WSL (loopback callback listener).
#   2. Each run gets a brand-new temporary Chrome user-data-dir
#      (oauth-sessions/oauth-fresh-<epoch>-<rand>), launched as a visible
#      window on the Pig via the one-shot PigiOAuthFresh scheduled task
#      (InteractiveToken, same mechanism as PigiPopBrowser, because a
#      cross-session SSH caller cannot show interactive windows itself).
#   3. The fresh profile has no GitHub cookies/session, so Nolan signs in as
#      whichever legitimate identity he wants and clicks Authorize. Nothing
#      from his everyday profiles (fb-profile, ig-profile, ...) is touched.
#   4. The CLI receives the loopback callback and stores its own credential.
#      Muse and Nolan never see, copy, or paste any token.
# FALLBACK PATH (device code): if the fresh-session path is unavailable or
#   times out, `copilot login` prints a code for github.com/login/device.
#
# After browser OAuth: zero-AI verification (auth presence, quota, models)
# and the broker identity (default identity_1, or the given identity_id) is
# marked ACTIVE. No AI generation happens here: zero credits.
#
# Cleanup: the temp profile, its Chrome processes, and the one-shot task are
# deleted on every path (success, timeout, failure, Ctrl-C). Stale residue
# from crashed runs is swept at startup. The deletion guard in
# src/fresh-oauth-session.js refuses anything outside the session base.
set -u

export PATH="$HOME/.local/node-v22.23.2-linux-x64/bin:$PATH"
BROKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BROKER_DIR"

IDENTITY_ID="${1:-identity_1}"
TASK_NAME="PigiOAuthFresh"
SESSION_PREFIX="oauth-fresh-"
CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
WEBFLOW_LOG=/tmp/copilot-webflow.log
URL_TIMEOUT="${WEBFLOW_URL_TIMEOUT:-25}"     # seconds to wait for the authorize URL
AUTH_TIMEOUT="${WEBFLOW_AUTH_TIMEOUT:-300}"  # seconds to wait for the human click
WIN_BASE=""
FRESH_MARKER=""
FRESH_PROFILE_DIR=""

if ! command -v copilot >/dev/null 2>&1; then
  echo "FAIL: copilot CLI not found. Run the broker install first."
  exit 1
fi
if [ ! -d "$BROKER_DIR/node_modules/@github/copilot-sdk" ]; then
  echo "FAIL: broker dependencies not installed. Run: cd $BROKER_DIR && npm install"
  exit 1
fi
if pgrep -f "copilot login" >/dev/null 2>&1; then
  echo "FAIL: a 'copilot login' process is already running. Finish or kill it first."
  exit 1
fi

pshell() {
  # Run PowerShell on the Windows side via WSL interop; strip CRLF.
  powershell.exe -NoProfile -Command "$1" 2>/dev/null | tr -d '\r'
}

# --- fresh-session helpers -------------------------------------------------
node_guard() {
  # node_guard <dir> -> "YES" if the dir is safe to delete, else "NO".
  node --input-type=module -e "
import { isDeletableDir } from './src/fresh-oauth-session.js';
console.log(isDeletableDir(process.argv[1], process.argv[2]) ? 'YES' : 'NO');" \
    "$1" "$WIN_BASE" 2>/dev/null
}

cleanup_windows_session() {
  # Kill ONLY chrome processes carrying the session marker, unregister the
  # one-shot task, and delete the temp profile dir (guarded by node_guard).
  local marker="$1" delete_dir="${2:-}"
  pshell "
    \$procs = Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { \$_.CommandLine -like '*$marker*' };
    foreach (\$p in \$procs) { try { Stop-Process -Id \$p.ProcessId -Force } catch {} };
    try { Unregister-ScheduledTask -TaskName '$TASK_NAME' -Confirm:\$false } catch {};
  " >/dev/null 2>&1
  if [ -n "$delete_dir" ]; then
    if [ "$(node_guard "$delete_dir")" = "YES" ]; then
      pshell "Remove-Item -Recurse -Force '$delete_dir'" >/dev/null 2>&1
    else
      echo "WARN: refusing to delete non-session dir: $delete_dir"
    fi
  fi
}

cleanup_current_session() {
  # Terminate the CLI's callback listener first: an orphaned `copilot login`
  # would keep its loopback port bound and block the next attempt's guard.
  # This covers Ctrl-C and any other EXIT path that bypasses webflow()'s
  # explicit pkill calls (which handle timeout and setup failures).
  pkill -f "copilot login --web-flow" 2>/dev/null
  if [ -n "${FRESH_MARKER:-}" ]; then
    cleanup_windows_session "$FRESH_MARKER" "${FRESH_PROFILE_DIR:-}"
  fi
  FRESH_MARKER=""
  FRESH_PROFILE_DIR=""
}

sweep_stale_sessions() {
  # Residue from crashed runs: leftover task, stray session chromes, temp dirs.
  cleanup_windows_session "$SESSION_PREFIX" ""
  local dirs d
  dirs=$(pshell "
    if (Test-Path '$WIN_BASE') { Get-ChildItem -Directory '$WIN_BASE' -ErrorAction SilentlyContinue | Where-Object { \$_.Name -like '$SESSION_PREFIX*' } | ForEach-Object { \$_.FullName } }
  ")
  while IFS= read -r d; do
    [ -z "$d" ] && continue
    if [ "$(node_guard "$d")" = "YES" ]; then
      pshell "Remove-Item -Recurse -Force '$d'" >/dev/null 2>&1
      echo "swept stale session dir: $d"
    fi
  done <<< "$dirs"
}

# --- primary path: fresh-session browser OAuth ------------------------------
webflow() {
  echo "--- trying browser OAuth in a fresh isolated session (primary path) ---"
  WIN_BASE=$(pshell "\$env:USERPROFILE + '\\.local\\share\\pigi\\oauth-sessions'")
  if [ -z "$WIN_BASE" ]; then echo "could not resolve Windows session base dir"; return 1; fi
  pshell "New-Item -ItemType Directory -Force '$WIN_BASE' | Out-Null" >/dev/null 2>&1

  sweep_stale_sessions

  rm -f "$WEBFLOW_LOG"
  setsid nohup copilot login --web-flow > "$WEBFLOW_LOG" 2>&1 < /dev/null &
  local pid=$!

  local url=""
  for _ in $(seq 1 "$URL_TIMEOUT"); do
    url=$(grep -o "https://github.com/login/oauth/authorize?[^ \"']*" "$WEBFLOW_LOG" 2>/dev/null | head -1)
    [ -n "$url" ] && break
    kill -0 "$pid" 2>/dev/null || break
    sleep 1
  done
  if [ -z "$url" ]; then
    pkill -f "copilot login --web-flow" 2>/dev/null
    echo "no authorize URL appeared in ${URL_TIMEOUT}s; falling back to device code."
    return 1
  fi
  echo "authorize URL captured."

  # Build the session spec + one-shot task XML (base64) via the tested module.
  local spec profileDir dirName xmlB64
  spec=$(node --input-type=module -e "
import { createSessionSpec, buildTaskXml } from './src/fresh-oauth-session.js';
const spec = createSessionSpec({ baseDir: process.argv[1], url: process.argv[2], chromePath: process.argv[3] });
console.log(spec.profileDir);
console.log(spec.dirName);
console.log(Buffer.from(buildTaskXml(spec), 'utf16le').toString('base64'));" \
    "$WIN_BASE" "$url" "$CHROME_PATH" 2>/dev/null)
  profileDir=$(printf '%s' "$spec" | sed -n 1p)
  dirName=$(printf '%s' "$spec" | sed -n 2p)
  xmlB64=$(printf '%s' "$spec" | sed -n 3p)
  if [ -z "$profileDir" ] || [ -z "$dirName" ] || [ -z "$xmlB64" ]; then
    pkill -f "copilot login --web-flow" 2>/dev/null
    echo "failed to build fresh session spec; falling back to device code."
    return 1
  fi

  local out
  out=$(powershell.exe -NoProfile -Command "\$xml=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$xmlB64')); Register-ScheduledTask -TaskName '$TASK_NAME' -Xml \$xml -Force -ErrorAction Stop | Out-Null; 'TASK_OK'" 2>&1 | tr -d '\r')
  if ! printf '%s' "$out" | grep -q '^TASK_OK$'; then
    pkill -f "copilot login --web-flow" 2>/dev/null
    echo "fresh-session task registration failed; falling back to device code."
    printf '%s\n' "$out" | head -3
    return 1
  fi
  out=$(powershell.exe -NoProfile -Command "Start-ScheduledTask -TaskName '$TASK_NAME' -ErrorAction Stop; 'START_OK'" 2>&1 | tr -d '\r')
  if ! printf '%s' "$out" | grep -q '^START_OK$'; then
    pkill -f "copilot login --web-flow" 2>/dev/null
    cleanup_windows_session "$dirName" "$profileDir"
    echo "fresh-session task start failed; falling back to device code."
    return 1
  fi

  # Session is live: arm cleanup for every exit path (success/timeout/Ctrl-C).
  FRESH_MARKER="$dirName"
  FRESH_PROFILE_DIR="$profileDir"
  trap cleanup_current_session EXIT

  echo
  echo "A FRESH Chrome window just opened on the Pig (isolated profile, no saved GitHub login)."
  echo "Sign in to GitHub as the identity you want to authorize, then click Authorize."
  if [ "$AUTH_TIMEOUT" -ge 60 ]; then
    echo "Waiting up to $((AUTH_TIMEOUT / 60)) minutes for the OAuth callback..."
  else
    echo "Waiting up to ${AUTH_TIMEOUT} seconds for the OAuth callback..."
  fi
  echo
  local waited=0
  while kill -0 "$pid" 2>/dev/null && [ "$waited" -lt "$AUTH_TIMEOUT" ]; do
    sleep 2
    waited=$((waited + 2))
  done
  local rc=0
  if kill -0 "$pid" 2>/dev/null; then
    pkill -f "copilot login --web-flow" 2>/dev/null
    echo "timed out waiting for the browser authorization."
    rc=1
  else
    wait "$pid"
    rc=$?
    if [ "$rc" -eq 0 ]; then
      echo "browser OAuth completed."
    else
      echo "copilot login exited with code $rc."
    fi
  fi
  cleanup_current_session
  trap - EXIT
  return "$rc"
}

# --- fallback path: device code ---------------------------------------------
deviceflow() {
  echo "--- device-code flow (fallback) ---"
  echo "Open the URL shown below in any browser, enter the code, authorize the app."
  echo
  copilot login
}

if [ "${AUTHORIZE_TEST_WEBFLOW_ONLY:-0}" = "1" ]; then
  if webflow; then echo "TEST: webflow returned 0"; else echo "TEST: webflow returned 1 (fallback would trigger)"; fi
  exit 0
fi

if webflow; then
  echo
  echo "=== verifying (zero AI calls) ==="
  copilot auth status || true
  node scripts/post-authorize.js "$IDENTITY_ID"
else
  deviceflow || { echo "FAIL: authorization did not complete."; exit 1; }
  echo
  echo "=== verifying (zero AI calls) ==="
  node scripts/post-authorize.js "$IDENTITY_ID"
fi
