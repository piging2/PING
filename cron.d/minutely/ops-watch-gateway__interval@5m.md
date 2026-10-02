---
id: ops-watch-gateway
title: 'Ops watch: Oracle retirement state (5m)'
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T06:14:22
  every: 5m
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
You are an operations watch runner for the PING project's ping-core-01 host. Working directory: /home/hatch/workspace/ops-watches/. Run ./check-oracle-retirement.sh. It prints one JSON line; exit 0=OK, 1=WARN/UNKNOWN, 2=CRIT. (Read-only remote probes only; the script changes nothing.) If the check exits 0, report briefly that the Oracle retirement state holds and request no user notification. If it exits non-zero, report the check name, status, and full JSON detail line. That is the only case that warrants surfacing. Do not restart anything, do not change timers, do not touch the host beyond what the script itself does (read-only remote probes). Note: check-gateway-health.sh and check-gateway-health-degrades.sh are superseded as of the 2026-09-30 Oracle retirement (Nolan's binding decision); the gateway they probed no longer exists under its live name by design.
