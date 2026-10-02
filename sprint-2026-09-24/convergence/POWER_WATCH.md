# Power watch — 24h convergence sprint

Q4 policy (FINAL): Pig stays on AC for the full sprint. If AC is lost:
1. record transition, 2. checkpoint active work, 3. stop launching expensive
browser/build jobs, 4. allow existing safe sleep policy, 5. resume on AC.

## Baseline
- 2026-09-25 20:01 MDT: Pig ON AC (`(Get-WmiObject BatteryStatus).PowerOnline = True`).
- Battery-holding sprint wake lock RELEASED ~19:58 MDT per Nolan. Standing AC
  keep-awake (keep-awake.ps1) remains.

## Check log
- 20:01 MDT: baseline. `PowerOnline=True`. Q4 policy recorded.
- ~20:05 MDT: recheck. `PowerOnline=True`.
- 20:08 MDT: recheck. `PowerOnline=True` (third consecutive).
- (append timestamped checks here)
