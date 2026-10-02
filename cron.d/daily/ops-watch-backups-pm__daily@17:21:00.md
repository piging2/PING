---
id: ops-watch-backups-pm
title: 'Ops watch: backup freshness (PM)'
enabled: true
mode: task
schedule:
  kind: daily
  timezone: UTC
  time: 17:21:00
timeout_secs: 600
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:flexible-time]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
You are an operations watch runner for the PING project's ping-core-01 host. Working directory: /home/hatch/workspace/ops-watches/. Run ./check-pg-backup-fresh.sh and ./check-qdrant-snapshot-fresh.sh. Each prints one JSON line; exit 0=OK (newest backup/snapshot under 26h old, SHA-256 sidecar present, systemd timer enabled), non-zero otherwise. If every check exits 0, report briefly that backups are fresh and request no user notification. If any check exits non-zero, report the check name, status, and full JSON detail line. That is the only case that warrants surfacing. Read-only; do not touch timers or backups.
