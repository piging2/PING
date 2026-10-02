---
id: workspace-mirror-to-pig
title: Workspace mirror to Pig
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-20T02:26:03
  every: 6h
timeout_secs: 1800
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Run the workspace-to-Pig delta mirror: execute /home/hatch/workspace/pig/mirror-workspace-to-pig.sh (rsync -az --delete of /home/hatch/workspace/ to pigwsl:/home/nolan/workspace/ via the pig-rsync.sh tunnel). The script appends to /home/hatch/workspace/pig/mirror.log. Stay silent on success. On non-zero exit, report the failure with the last 20 lines of the log. Do not retry blindly; if the Pig is unreachable, leave the failure in the log and stay quiet unless it fails three runs in a row.
