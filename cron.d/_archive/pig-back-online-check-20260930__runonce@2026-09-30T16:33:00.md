---
id: pig-back-online-check-20260930
title: Pig back-online check (16:33 MDT)
enabled: true
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-30T16:33:00
timeout_secs: 300
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Pig was expected offline ~16:15-16:31 MDT (Nolan's note). Check whether it is back and whether :3100 serves.

Run: tunnel_proxy="${HTTPS_PROXY%:*}:3130"; curl -s --max-time 25 --proxy "$tunnel_proxy" http://100.79.154.43:3100/api/readyz; then curl -s -o /dev/null -w "mc:%{http_code}\n" --max-time 25 --proxy "$tunnel_proxy" http://100.79.154.43:3100/mission-control

Report to Nolan: Pig back or still down; :3100 serving or not; if serving, the commitSha from /api/readyz and whether it still matches 51831c61. If still down, say so plainly and do NOT take any recovery action (no reboot, no restart attempts; Pig reboot needs Nolan's explicit word). One check only; do not retry in a loop.
