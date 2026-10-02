---
id: pig-storage-watch
title: Pig storage watch (daily)
enabled: true
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 07:21:00
timeout_secs: 300
metadata:
  tags: [cron:flexible-time]
  originating_chat_context_json: '{"chat_id":"33605f45-a9d1-444c-b91f-8cae8fd078a6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Daily deterministic storage observation for the Pig (Incident Zero recurrence guards). No AI judgment, no deletions, no restarts — pure measurement.

1. Run `~/workspace/pig-storage/storage-watch.sh` (it appends one CSV row to storage-watch-log.csv and rewrites storage-watch-status.md).
2. Read `~/workspace/pig-storage/storage-watch-status.md`.
3. Reporting discipline (Nolan: stay quiet when healthy):
   - Status NORMAL or GUARDED: end quietly. Do not message the user. Log the observation to the daily note `~/memory/YYYY-MM-DD.md` under a "storage watch" line and finish.
   - Status WARN, CRITICAL, EMERGENCY, or UNREACHABLE: report to the main chat with the status file's numbers, the 24h deltas, and the operator action the ladder prescribes. Never auto-delete anything.
   - Status UNREACHABLE twice in a row: report (Pig may be down wedged tunnel, or powered off).
