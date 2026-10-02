---
id: ops-watch-daily
title: 'Ops watch: daily policy checks'
enabled: true
mode: task
schedule:
  kind: daily
  timezone: UTC
  time: 06:21:00
timeout_secs: 600
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:flexible-time]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
You are an operations watch runner for the PING project's ping-core-01 host. Working directory: /home/hatch/workspace/ops-watches/. Run ./check-rpcbind-closed.sh, ./check-memory-containment.sh, ./check-deployment-drift.sh, and ./check-restore-drill-stale.sh. Each prints one JSON line; exit 0=OK, 1=WARN, 2=CRIT. The drift check compares the live gateway container against baselines/gateway-inspect.json (image digest, ports, restart policy, memory ceiling, healthcheck). The drill-stale check warns if the last proven isolated restore in state.json is older than 30 days (a fresh drill becomes due before 2026-10-24). If every check exits 0, report briefly that the daily policy checks are healthy and request no user notification. If any check exits non-zero, report the check name, status, and full JSON detail line. That is the only case that warrants surfacing. Read-only; do not restart anything or touch the host.
