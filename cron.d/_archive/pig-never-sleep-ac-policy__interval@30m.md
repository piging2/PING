---
id: pig-never-sleep-ac-policy
title: Pig never-sleep-on-AC policy applier
enabled: true
owner: goal:fyd-social-product-build
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T12:53:15
  every: 30m
timeout_secs: 600
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
One-shot applier for the Pig never-sleep-on-AC power policy (Nolan's P0 directive 2026-09-24: on AC power, the Pig must not enter automatic sleep while acting as automation/server host; battery behavior stays as-is).

Steps:
1. If /home/hatch/workspace/pig/.power-policy-applied exists, the policy is already verified on the host. Remove this cron job (cron.remove id pig-never-sleep-ac-policy) and stay quiet.
2. Otherwise run /home/hatch/workspace/pig/apply-never-sleep-ac.sh. It self-skips while the Pig is unreachable (sleep/tunnel down), applies standby-idle 0 and hibernate 0 on AC via powercfg when reachable, verifies both AC indexes are 0x00000000, and writes the marker file only on verified success. Read-only otherwise; it changes nothing on the sandbox.
3. If the marker file now exists, the policy is live. Remove this cron job with cron.remove and report one short confirmation to Nolan (he ordered this change).
4. If the log shows VERIFY_UNCLEAR or the script errored, surface that to Nolan. Otherwise stay quiet; the Pig is still asleep and the next run will retry.

Never claim the policy is active unless the marker file exists.
