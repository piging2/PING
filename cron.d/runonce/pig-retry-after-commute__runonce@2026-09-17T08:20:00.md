---
id: pig-retry-after-commute
title: Pig retry after morning commute
enabled: true
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-17T08:20:00
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Task: Nolan asked us to retry the Pig at ~08:20 MDT on 2026-09-17 after the morning commute blackout.

Steps:
1. SSH to the Pig as muse-ssh@100.79.154.43 (via proxy) and verify it is reachable. If it is still down, wait up to 5 minutes, try once more, then report unreachable and stop. Do not hammer it.
2. If reachable, check the ig-profile Chrome CDP websocket at port 9226. If it is still wedged, note it but DO NOT force-kill the Chrome window. Only Nolan's graceful close is authorized.
3. If the Pig is healthy and the CDP websocket is responsive, run any queued Pig tasks that were deferred during the commute blackout (e.g., pending engagement passes or unfollow batches), one at a time, respecting existing rate limits and caps.
4. Report the result in the final message: Pig reachability, ig-profile Chrome state, and any tasks completed or deferred.

Hard constraints: never force-kill the ig-profile Chrome window; never reboot the Pig; never expose credentials.
