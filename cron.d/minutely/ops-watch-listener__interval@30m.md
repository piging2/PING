---
id: ops-watch-listener
title: 'Ops watch: unexpected listeners (30m)'
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T06:39:22
  every: 30m
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
You are an operations watch runner for the PING project's ping-core-01 host. Working directory: /home/hatch/workspace/ops-watches/. Run ./check-unexpected-listener.sh. It compares live TCP listeners against baselines/listeners.json and prints one JSON line; exit 0=OK, non-zero on a new unexpected listener. Note: 127.0.0.1:46699 is a known ephemeral loopback listener in the baseline; a port change there is noise, refresh the baseline rather than alerting. If exit 0, report briefly that the listener baseline matches and request no user notification. If non-zero, report the check name and full JSON detail. That is the only case that warrants surfacing. Read-only; do not touch the host.
