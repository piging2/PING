# pig-health.sh hang fix (2026-09-23 ~20:41 MDT)
- The 20:17 MDT heartbeat tick timed out at the 300s scheduler budget with no output.
- Root cause: two `pigwsl-run.sh` calls in `~/workspace/pig/pig-health.sh` (the consolidated
  WSL probe and the Windows last-boot probe) had no timeout. `pigwsl-run.sh` itself has no
  internal timeout, so a stalled SSH tunnel hangs the whole run until the scheduler kills it.
- The Pig was never down: the 20:27 tick completed UP, and a manual run after the fix shows
  UP with all checks green (ssh, wsl, docker, postgres, gateway, disk 9%, C: 17.7% free,
  CDP 4/4 alive, boot 2026-09-16T10:00).
- Fix: wrapped the WSL probe in `timeout 60` and the win_boot probe in `timeout 45`.
  Empty output already degrades gracefully via the existing `|| true` handling.
  Worst-case run time is now ~2-3 min, well under the 300s budget.
- Verified: `bash -n` clean, manual run completes in ~16s, exit 0, status UP (was UP, no transition).
