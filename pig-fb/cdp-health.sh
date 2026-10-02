#!/usr/bin/env bash
# cdp-health.sh -- deterministic CDP health probe for the Pig's headed Chromes.
# Usage: cdp-health.sh [port ...]   (default: 9223 9225 9226 9227)
# Output per port: "PORT <port> (<profile>) ALIVE <browser>" or "PORT <port> (<profile>) DOWN"
# Exit 0 if every probed port answers, 1 if any is DOWN, 2 on usage error.
#
# Read-only: one HTTP GET per port against the local CDP /json/version endpoint.
# Lesson encoded (re-derived from scratch on the 2026-09-15 night watch): the
# Pig's remote shell is cmd.exe, so Unix pipes (| head | cut) DO NOT WORK in the
# remote command string; use PowerShell Invoke-WebRequest -UseBasicParsing and
# parse the Browser version locally.
#
# Convergence: night-watch-cycle runs this exact probe every hour. Before this
# script it was hand-written inline each time (fragile, and the cmd.exe pipe
# breakage was re-discovered at least once). Now it is one deterministic script.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/pig-ssh.sh"

declare -A PROFILE=( [9223]=fb [9225]=x [9226]=ig [9227]=tt )

# Extract the Browser version string from a /json/version payload.
# Prints the version or nothing on unparseable input. Never fails.
cdp_browser_of() {
  printf '%s' "$1" | grep -o '"Browser"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4
}

# Probe one port; prints the typed result line; returns 0 when ALIVE, 1 when DOWN.
probe_port() {
  local port="$1"
  local label="${PROFILE[$port]:-port$port}"
  local body browser
  body="$(PIG_TIMEOUT=20 pig_ssh "powershell -NoProfile -Command \"try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 8 http://127.0.0.1:$port/json/version).Content } catch { '' }\"" 2>/dev/null || true)"
  browser="$(cdp_browser_of "$body")"
  if [ -n "$browser" ]; then
    echo "PORT $port ($label) ALIVE $browser"
    return 0
  fi
  echo "PORT $port ($label) DOWN"
  return 1
}

main() {
  local ports=("$@")
  [ ${#ports[@]} -eq 0 ] && ports=(9223 9225 9226 9227)
  local down=0 port
  for port in "${ports[@]}"; do
    case "$port" in
      ''|*[!0-9]*) echo "usage: cdp-health.sh [port ...]" >&2; return 2 ;;
    esac
    probe_port "$port" || down=1
  done
  return "$down"
}

# Sourced for testing? Define functions only; otherwise run.
if [ "${CDP_HEALTH_SOURCE_ONLY:-}" != "1" ]; then
  main "$@"
fi
