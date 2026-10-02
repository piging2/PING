---
id: pig-wake-watch-polish
title: 'Pig wake-watch: resume sprint polish lane'
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-26T21:25:47
  every: 15m
timeout_secs: 1800
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Pig wake-watch for the FYD 24-hour design sprint (deadline ~19:00 MDT Sept 27).

1. Run: bash ~/workspace/design-sprint-2026-09-26/pig-wake-resume.sh
   - The script is idempotent and stateful. If the Pig is still asleep it exits quietly; do nothing further.
2. Read ~/workspace/design-sprint-2026-09-26/pig-wake-resume.status (tail).
3. If the status contains "VERDICT: DONE": the polish lane (visitor-projection purity + conversion fixes) is committed, merged into design/sprint-visual-v1, rebuilt, live on :3200, and v3 screenshots are in C:/Users/nolan/design-sprint/shots/v3-polish. Remove this cron job (cron.remove id pig-wake-watch-polish) so it stops polling, and report DONE with the commit hash and screenshot path.
4. If the status contains "FAILED": remove this cron job and report the failure lines from the status file plainly.
5. Otherwise (Pig still asleep, no verdict): end the run silently with no user-visible message.

Do not retry failed steps yourself; the script already handles resume. Do not touch :3100.
