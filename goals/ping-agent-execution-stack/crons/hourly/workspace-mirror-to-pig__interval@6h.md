---
id: workspace-mirror-to-pig
title: Workspace mirror to Pig
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-20T02:26:03
  every: 6h
timeout_secs: 1800
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Run the workspace-to-Pig delta mirror: execute /home/hatch/workspace/pig/mirror-workspace-to-pig.sh (chunked rsync -az --delete: one root-files chunk plus one rsync per top-level directory of /home/hatch/workspace/ to pigwsl:/home/nolan/workspace/ via the pig-rsync.sh tunnel). The script appends per-chunk timings and a final exit= line to /home/hatch/workspace/pig/mirror.log. Stay silent on success. On non-zero exit, report the failure with the last 20 lines of the log. On a tunnel failure (the log shows RETRY_RECOMMENDED=10, =12, or =255): schedule a one-shot catch-up retry about 30 minutes out via cron.add (id workspace-mirror-catchup, kind runonce, owner goal:ping-agent-execution-stack, body: execute the same mirror script once, report the result; on failure report only and do NOT schedule any further retry), but only if no catch-up is already queued (check cron.status id=workspace-mirror-catchup first). Do not retry other failures blindly; if the Pig is unreachable, leave the failure in the log and stay quiet unless it fails three runs in a row.
