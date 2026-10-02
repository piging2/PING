# Workspace mirror resilience fix (2026-09-23 ~21:15 MDT)
- Two consecutive mirror failures (14:26, 20:26 MDT): rsync 255, broken pipe.
  7.8G workspace over a long-lived SSH tunnel through the egress proxy; the
  proxy drops the connection mid-transfer. Pig itself is reachable.
- Fix in mirror-workspace-to-pig.sh: added --partial --append-verify (resume
  interrupted files instead of restarting) and --timeout=120 (fail fast on
  I/O stall instead of hanging until the scheduler kills the run).
- Task rule: report to Nolan only on three consecutive failures. This was #2.
  Next scheduled run (~02:26 MDT) exercises the fix; if it fails, that is #3
  and gets reported with the log tail.
