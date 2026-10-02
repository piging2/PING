---
id: pig-ssh-watch
title: Pig SSH recovery watch (30m, alert-only)
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T16:54:53
  every: 30m
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Check whether Pig SSH has recovered. Run: `~/workspace/pig-fb/pigwsl-exec.sh -s 'echo PIG_OK'` with a short timeout. If the output contains PIG_OK, report loudly to chat: "Pig SSH has recovered." and nothing else. If it fails or times out, stay completely silent (do not report). Do not run any other commands, do not touch production, do not retry in a loop. This watch exists so the swarm orchestrator can spawn the D-SHIP lane (staged in ~/workspace/lane-d-impl/SHIP-PLAN.md) and the EDGE-1 port once the Pig is reachable again.
