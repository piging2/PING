# Host policy: AC system sleep (recorded 2026-10-01 ~11:56 MDT)

Binding directive (Nolan, CEO-ORDER-PROOF-PASSED-2026-10-01, carried into MARKETINGOS OPERATIONALIZATION WAVE):
WHEN ON AC AND DESIGNATED AS AN AUTOMATION WORKER: PREVENT SYSTEM SLEEP.
Display sleep is fine. SYSTEM SLEEP DURING ACTIVE AUTOMATION IS NOT.
Worker-level wake inhibition remains useful for critical bounded jobs but must not be the sole baseline.
This is host policy, not application architecture.

## Change applied 2026-10-01

Command (on Pig via powershell.exe):
  powercfg /change standby-timeout-ac 0

## Before-values (recorded before change)

Scheme: Balanced (381b4222-f694-41f0-9685-ff5bb260df2e)
- SUB_SLEEP / STANDBYIDLE (Sleep after): AC = 0x708 (1800 s = 30 min), DC = 0x0 (never)
- SUB_VIDEO / VIDEOIDLE (Turn off display after): AC = 0x78 (120 s), DC = 0x78 (120 s) -- UNCHANGED per directive (display sleep allowed)

## After-values (verified)

- SUB_SLEEP / STANDBYIDLE: AC = 0x0 (never), DC = 0x0 (never, untouched)
- SUB_VIDEO / VIDEOIDLE: unchanged (AC 0x78, DC 0x78)

## Rollback (exact)

  powercfg /change standby-timeout-ac 30

(30 = minutes; restores the 0x708 / 1800 s before-value. DC and display settings were not changed and need no rollback.)

## Notes

- Battery behavior untouched (no authorization to alter it).
- This supersedes the 2026-10-01 reversion to before-values noted in the wave context.
- Related prior records: ~/workspace/pig/WAKE-LOCK-EVIDENCE-2026-09-23.md, ~/workspace/pig/battery-proof-2026-09-27.md, ~/workspace/pig/apply-never-sleep-ac.sh.
