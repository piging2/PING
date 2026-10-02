# Battery-mode proof — 2026-09-27

## Result: PASS

Window: 2026-09-27 16:48:41 → 16:54:17 MDT (5.6 min), entire window on battery.

## Evidence

- 15/15 workload ticks executed, ~22s spacing, zero gaps, all with PowerOnLine=False.
- Charge 95% → 91% across the window. No low-battery abort (threshold 20%).
- Kernel-Power Event 42 (sleep): 0 in window.
- WSL: alive at start and end. CDP :9223: OPEN at start and end.
- FYD :3100: Windows-side TCP probe reported CLOSED (known WSL-forwarding artifact);
  WSL-side verification during the window: listener on *:3100 and
  GET /sites/happy-place → HTTP 200.
- Script: C:\Windows\Temp\pig-battery-proof-run2.ps1, log C:\Windows\Temp\battery-proof-2026-09-27.log.

## Honest residual

- One Kernel-Power Event 506 at 16:50:26: "The system is entering Modern Standby,
  Reason: Idle Timeout." Entry was shallow: execution never suspended (ticks
  continuous, no wake event, no Event 42, CDP/WSL/FYD all survived). Likely dragged
  in by the 2-minute DC display-off timer. The sleep policy itself verified Never
  on both AC and DC before, during, and after the window (active scheme Balanced,
  no scheme switch on unplug). Per Nolan's order, not chasing further: the required
  property (idle does not suspend execution on battery) is proven.

## AC restore

- Nolan reconnected AC after the proof. Verified BatteryStatus=2 (on AC) at ~17:50,
  charge 60% (drained 91→60 during the ~55 min post-proof battery interval).

## Context

- Policy under test: Nolan's 2026-09-27 always-on override (sleep Never on AC and
  battery; display independent). Applied ~16:53 MDT, read back verified.
- Run 1 (armed 16:27) timed out with no unplug; made no changes, ran no workload.
- Next: scheduled >90-min soak verification at 17:50 MDT
  (pig-power-soak-proof-2026-09-27), then power-management work freezes.
