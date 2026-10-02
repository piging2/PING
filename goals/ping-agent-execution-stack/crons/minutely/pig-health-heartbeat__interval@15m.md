---
id: pig-health-heartbeat
title: Pig health heartbeat
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-18T12:26:18
  every: 15m
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Pig health heartbeat (read-only, antifragility workstream). Run `/home/hatch/workspace/pig/pig-health.sh` and read its first output line plus `~/workspace/pig/antifragility/health-state.json`.

The script checks SSH reachability, WSL liveness, Docker daemon, ping-postgres and ping-gateway containers, CDP profiles 9223/9225/9226/9227, disk pressure, and Windows last-boot. It appends to `health-log.jsonl` only on state transitions and exits 0 when UP, 1 otherwise. It is read-only: it changes nothing on the Pig, handles no credentials, and never restarts or kills anything.

Reporting rule: if status is UP, end the run quietly with a one-line internal note (no user-facing report). If status is DOWN, DEGRADED, or LIKELY_BLACKOUT, surface a concise alert: the status, which checks failed (from health-state.json), and whether it looks like a commute blackout (06:45-08:15 or 15:45-17:15 America/Denver) versus a real outage. Never attempt recovery yourself; alerting is the job. Do not edit MEMORY.md.
