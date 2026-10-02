---
id: pig-506-proof-window-check
title: Pig 506 proof-window observation (never-sleep-on-AC)
enabled: true
owner: goal:fyd-social-product-build
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-24T13:21:00
metadata:
  tags: [cron:flexible-time]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Run the Pig never-sleep proof-window observation: execute `/home/hatch/workspace/pig/observe-506.sh` (it queries Kernel-Power 506/507 on the Pig since 12:36 MDT, checks the keep-awake holder and the SYSTEM power request, and appends a verdict to `/home/hatch/workspace/pig/power-policy.log`). Then read the tail of that log and report the VERDICT line. If VERDICT is PASS, reply briefly and stay quiet (routine healthy check, do not notify the user beyond this run's result). If VERDICT is CHECK, or the script fails, surface the details: this is the acceptance proof for the never-sleep-on-AC policy and needs attention. Do not modify the policy, the holder, or :3100; this job only observes.
