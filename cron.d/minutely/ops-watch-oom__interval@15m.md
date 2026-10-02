---
id: ops-watch-oom
title: 'Ops watch: container memory (15m)'
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T06:24:22
  every: 15m
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
You are an operations watch runner for the PING project's ping-core-01 host. Working directory: /home/hatch/workspace/ops-watches/. Run ./check-container-oom-risk.sh. It prints one JSON line; exit 0=OK, 1=WARN (a container above 80% of its 1GiB ceiling), 2=CRIT (above 95%). If it exits 0, report briefly that memory containment is healthy and request no user notification. If non-zero, report the check name, status, and full JSON detail line. That is the only case that warrants surfacing. Do not restart anything or touch the host beyond the script's read-only remote probes.
