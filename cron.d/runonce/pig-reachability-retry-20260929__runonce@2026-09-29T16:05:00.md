---
id: pig-reachability-retry-20260929
title: Pig reachability retry (Nolan's 12-minute ask)
enabled: true
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-29T16:05:00
timeout_secs: 300
delivery:
  - chat_id: 76d7c127-fea6-44d1-a77e-1665978229c6
metadata:
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Pig reachability retry Nolan asked for at ~16:05 MDT (he is leaving work and wants a fresh attempt 12 minutes after his 15:53 message).

Run both probes, bounded:
1. SSH path: `timeout 40 ssh -F /home/hatch/.ssh/pig-config -o LogLevel=ERROR pigwsl 'echo PIG_OK'`
2. HTTP path via tunnel proxy: `timeout 25 curl -s -o /dev/null -w "HTTP:%{http_code}" --proxy "${HTTPS_PROXY%:*}:3130" --max-time 18 http://100.79.154.43:3100/`

Report a verdict to the user: PIG REACHABLE (with which path answered) or PIG STILL UNREACHABLE (with the exact failure lines from both paths). Do NOT attempt recovery, reboot, wake, or any state change: read-only probe only. If reachable, note the transport recovered on its own; do not claim a cause.
