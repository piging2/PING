#!/bin/bash
# observe-506.sh -- one-shot verdict for the never-sleep-on-AC proof window.
# Counts Kernel-Power 506 (idle-enter) / 507 (resume) since the holder was
# verified working (2026-09-24 12:36 MDT), checks the holder process and the
# SYSTEM execution request, appends a verdict to power-policy.log.
# Verdict criterion: zero 506 entries after the window start.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SINCE_LOCAL="2026-09-24T12:36:00"

evts="$("$HERE/pigwsl-run.sh" 'powershell.exe -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName='\''System'\''; ID=506,507} -MaxEvents 30 | Where-Object { $_.TimeCreated -ge [datetime]'\''2026-09-24T12:36:00'\'' } | ForEach-Object { $_.TimeCreated.ToString('\''HH:mm:ss'\'') + \" ID=\" + $_.Id + \" R\" + $_.Properties[0].Value }"' 2>/dev/null | tr -d '\r' | head -30)"
holder="$(timeout 30 "$HERE/pigwsl-run.sh" 'ps aux | grep "[k]eep-awake.ps1" | wc -l' 2>/dev/null | tr -dc 0-9)"
sysreq="$(timeout 45 "$HERE/pigwsl-run.sh" 'powershell.exe -NoProfile -Command "powercfg /requests"' 2>/dev/null | grep -A1 '^SYSTEM:' | tail -1 | tr -d '\r')"
n506="$(printf '%s' "$evts" | grep -c ' ID=506 ' || true)"

{
  echo "=== 506/507 observation $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "window start: $SINCE_LOCAL MDT (keep-awake holder verified working)"
  echo "events since window start:"
  if [ -n "$evts" ]; then printf '%s\n' "$evts"; else echo "(none)"; fi
  echo "506 count since window start: $n506"
  echo "keep-awake holders running: ${holder:-unknown}"
  echo "SYSTEM power request: ${sysreq:-unknown}"
  req_state="NOT-HELD"; case "${sysreq:-}" in *powershell.exe*) req_state="HELD";; esac
  if [ "$n506" = "0" ] && [ "${holder:-0}" = "1" ] && [ "$req_state" = "HELD" ]; then
    echo "VERDICT: PASS -- no idle-enter 506 since holder verified, request HELD"
  else
    echo "VERDICT: CHECK -- 506s=$n506 holders=${holder:-unknown} request=$req_state (investigate)"
  fi
} >> "$HERE/power-policy.log"
echo "observation appended to power-policy.log (506s=$n506 holders=${holder:-unknown})"
