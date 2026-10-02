# Soak proof probe: count Kernel-Power Event ID 506 (standby entries)
# in the Pig's System log with timestamp >= 2026-09-27 16:53 MDT.
# Expected output: 0. Transient probe file; deleted after the run.
$evts = Get-WinEvent -FilterHashtable @{LogName='System'; Id=506; StartTime='2026-09-27 16:53'} -ErrorAction SilentlyContinue
@($evts).Count
