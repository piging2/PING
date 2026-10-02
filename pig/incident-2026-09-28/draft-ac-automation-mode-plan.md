# DRAFT — AC Automation Mode powercfg plan (NOT APPLIED)
# Status: draft pending Phase 2 root-cause evidence. Nolan's directive: do not
# apply power changes on hypothesis. This plan is filled as far as evidence allows.

## Context
- 2026-09-24 (proven): on this S0 Modern Standby Dell, display-off triggers S0
  standby entry even when AC sleep-after=Never. `power-policy.log` / sleepstudy
  36 entries: Enter Reason = "Video Idle Timeout".
- 2026-09-27 16:11 MDT: STANDBYIDLE AC=0 (Never), VIDEOIDLE AC=0 (Never) — closed
  both the idle-timer and the display-off trigger.
- 2026-09-27 16:53 MDT (Nolan override, always-on node): standby-timeout-ac 0
  (no-op), standby-timeout-dc 0 (Never), monitor-timeout-ac 15.
  => VIDEOIDLE AC is now 15 min: display turns off after 15 min on AC.
  => The display-off -> S0 bypass path may be REOPENED by this change.
- Tonight 03:41 MDT: HOST_ASLEEP despite sleep=Never on AC+DC. If forensics
  shows Enter Reason = "Video Idle Timeout", the 16:53 monitor-timeout-ac=15
  change is the prime suspect.

## BEFORE (effective policy per 2026-09-27 16:53, to be re-verified by tonight's forensics `powercfg /query`)
- Scheme: Balanced (381b4222-f694-41f0-9685-ff5bb260df2e)
- STANDBYIDLE (Sleep after): AC = 0x00000000 (Never), DC = 0x00000000 (Never)
- VIDEOIDLE (Turn off display after): AC = 0x00000384 (15 min), DC = 0x00000078 (2 min)
- HIBERNATEIDLE (Hibernate after): AC = 0x00000000 (Never), DC = 0x7fffffff (Never)
- keep-awake.ps1 holder: ALWAYS-ON per Nolan 2026-09-25 ~20:23 (ES_CONTINUOUS | ES_SYSTEM_REQUIRED)

## PROPOSED CHANGE — AUTOMATION MODE (AC), two branches pending forensics

Branch A (if SleepStudy 506 Enter Reason = "Video Idle Timeout" for 03:41):
The display-off trigger is live. Nolan allows display-off, so preferred fix is
NOT to force the display on; it is to make the execution-state holder provably
effective. Steps:
  1. Verify keep-awake.ps1 holder alive + heartbeat fresh (C:\Users\nolan\keep-awake.status).
     If dead: root-cause the holder death first (keep-awake-error.log), restart via
     /home/nolan/keep-awake-start.sh restart, add holder-death alerting.
  2. If holder was alive at 03:41 and sleep still occurred: holder mechanism is
     insufficient on this platform -> set VIDEOIDLE AC=0 (display stays on) as the
     proven 16:11 posture, and escalate the SetThreadExecutionState failure.
Branch B (if 03:41 was NOT S0 standby: no 506, or state C remote-path failure):
  No power-policy change at all. Fix the actual failed layer (Tailscale/WSL/networking).

## COMMAND (Branch A fallback only, AC-only indexes)
powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 0
(powercfg /setacvalueindex uses AC/DC-specific indexes; DC untouched.)

## AFTER (expected)
- VIDEOIDLE: AC = 0x00000000 (Never), DC = 0x00000078 (2 min, UNCHANGED)
- All other values unchanged from BEFORE.

## ROLLBACK (exact)
powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 900
(restores the 16:53 Nolan-override value: 15 min = 900 s)
Verify with: powercfg /query SCHEME_CURRENT SUB_VIDEO

## NOT TOUCHED (explicit)
- Thermal protection, critical-battery action/levels, hibernate timeouts,
  lid-close and power-button behavior, fast startup, wake timers policy.
- No firmware changes, no registry hacks outside powercfg.

## NORMAL LAPTOP MODE (reversible, user-visible)
Restore pre-2026-09-27 posture:
  powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 1800
  powercfg /setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 120
  powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 1200
  (DC VIDEOIDLE stays 120; hibernate untouched.)
Mode state: C:\Users\nolan\pig-mode.txt + ~/workspace/pig/pig-mode.txt
  containing: MODE=AUTOMATION|NORMAL, set_at UTC, set_by, reason.
One script flips both files and applies the matching powercfg set; the
heartbeat reports the mode so it is always visible.
