#!/usr/bin/env bash
# One-shot: apply never-sleep-on-AC power policy to the Pig.
# Self-skips while the Pig is unreachable (asleep/tunnel down).
# Writes MARKER only after the policy is VERIFIED on the host.
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../pig-fb/pig-ssh.sh"
MARKER="$SCRIPT_DIR/.power-policy-applied"
LOG="$SCRIPT_DIR/power-policy.log"

ts() { date -u +%FT%TZ; }

[ -f "$MARKER" ] && { echo "$(ts) already applied, skipping" >>"$LOG"; exit 0; }

if ! PIG_TIMEOUT=15 pig_ssh "echo PIG_UP" >/dev/null 2>&1; then
  echo "$(ts) PIG_UNREACHABLE (tunnel/sleep), will retry next run" >>"$LOG"
  exit 0
fi

# Apply: standby idle never on AC, hibernate never on AC. Battery policy untouched.
pig_ssh 'powershell -NoProfile -Command "powercfg /x -standby-timeout-ac 0; powercfg /x -hibernate-timeout-ac 0; exit $LASTEXITCODE"' >>"$LOG" 2>&1
APPLY_RC=$?
echo "$(ts) powercfg apply rc=$APPLY_RC" >>"$LOG"

# Verify: "Sleep after" (29f6c1db-...) and "Hibernate after" (9d7815a6-...) AC indexes must be 0.
SLEEP_AC=$(pig_ssh 'powershell -NoProfile -Command "(powercfg /query SCHEME_CURRENT SUB_SLEEP 29f6c1db-86da-48c5-9fdb-f2b67b1f44da | Select-String \"Current AC Power Setting Index\").ToString()"' 2>/dev/null)
HIB_AC=$(pig_ssh 'powershell -NoProfile -Command "(powercfg /query SCHEME_CURRENT SUB_SLEEP 9d7815a6-7ee4-497e-8888-515a05f02364 | Select-String \"Current AC Power Setting Index\").ToString()"' 2>/dev/null)
echo "$(ts) verify sleep_ac='$SLEEP_AC' hibernate_ac='$HIB_AC'" >>"$LOG"

if echo "$SLEEP_AC" | grep -q "0x00000000" && echo "$HIB_AC" | grep -q "0x00000000"; then
  echo "$(ts) VERIFIED: never-sleep-on-AC active (standby idle 0, hibernate 0)" >>"$LOG"
  touch "$MARKER"
else
  echo "$(ts) VERIFY_UNCLEAR: manual check required" >>"$LOG"
fi
