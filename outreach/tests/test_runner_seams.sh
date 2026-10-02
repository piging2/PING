#!/usr/bin/env bash
# Static assertions for the authority-gate runner seams (2026-09-29 general-bug fix).
# For each of the 7 external-action runner scripts:
#   1. bash -n syntax check passes
#   2. an authority-check.py invocation with the correct surface exists
#   3. the gate call's line number is BEFORE the first external-effect line
# Run: bash test_runner_seams.sh
set -u
PIGFB="$HOME/workspace/pig-fb"
pass=0; fail=0

ok()   { pass=$((pass+1)); echo "PASS: $1"; }
bad()  { fail=$((fail+1)); echo "FAIL: $1"; }

# script -> "surface|first-external-effect-marker"
declare -A SEAMS=(
  [run_pass.sh]="facebook|browser_lock_acquire"
  [run_ig_pass.sh]="instagram|browser_lock_acquire"
  [run_tk_pass.sh]="tiktok|ensure-cdp-tt.sh"
  [run_th_pass.sh]="threads|ensure-cdp-ig.sh"
  [x-engage.sh]="x|pig_ssh \"echo PIG_OK\""
  [x-follow-batch.sh]="x|pig_ssh \"powershell"
  [x-comment.sh]="x|pig_ssh \"echo PIG_OK\""
)

for script in "${!SEAMS[@]}"; do
  IFS='|' read -r surface marker <<< "${SEAMS[$script]}"
  path="$PIGFB/$script"

  if bash -n "$path" 2>/dev/null; then ok "$script syntax"; else bad "$script syntax"; fi

  gate_line=$(grep -n "authority-check.py\" $surface" "$path" | head -1 | cut -d: -f1)
  if [ -n "$gate_line" ]; then
    ok "$script calls authority-check.py $surface (line $gate_line)"
  else
    bad "$script missing authority-check.py $surface call"; continue
  fi

  effect_line=$(grep -n -F "$marker" "$path" | head -1 | cut -d: -f1)
  if [ -n "$effect_line" ] && [ "$gate_line" -lt "$effect_line" ]; then
    ok "$script gate (line $gate_line) precedes first external effect (line $effect_line)"
  else
    bad "$script gate NOT before first external effect (gate=$gate_line effect=$effect_line)"
  fi
done

echo "---- $pass passed, $fail failed ----"
[ "$fail" -eq 0 ]
