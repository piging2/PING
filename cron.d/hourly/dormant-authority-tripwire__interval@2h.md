---
id: dormant-authority-tripwire
title: Dormant-authority tripwire (2h, alert-only)
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T17:52:39
  every: 2h
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Run the dormant-authority tripwire: `bash ~/workspace/swarm/hidden_files/obs-trip/tripwire.sh`. This is a read-only observation pass (SELECT COUNT(*) only, process/port checks). It exits 0 on QUIET or 2 on ALERT. Report to chat ONLY on ALERT (first-ever row in canonical_events or repository_events, a second fyd-journal-gateway process, or any new live writer to either table) or on a run failure; on QUIET, stay silent. Do not write to any database, do not touch production containers, do not modify volumes or schedules. Baselines live in ~/workspace/swarm/hidden_files/obs-trip/baseline.json; pass history in runs.log.
