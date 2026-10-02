---
id: deterministic-doctor
enabled: true
mode: task
delivery: []
timeout_secs: 300
schedule:
  kind: interval
  timezone: UTC
  at: 2026-01-01T00:00:00
  every: 1h
  catchup: none
metadata:
  created_by: system
  system_schedule_policy: exact
---
# Deterministic Doctor

This system cron is executed directly by the daemon scheduler host. If a legacy worker reaches this prompt, stop after noting that there is no user-visible result.
