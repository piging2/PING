---
id: workspace-mirror-catchup
title: Workspace mirror catch-up retry
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-27T02:56:00
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
Run the workspace-to-Pig delta mirror: execute /home/hatch/workspace/pig/mirror-workspace-to-pig.sh (chunked rsync -az --delete: one root-files chunk plus one rsync per top-level directory of /home/hatch/workspace/ to pigwsl:/home/nolan/workspace/ via the pig-rsync.sh tunnel). The script appends per-chunk timings and a final exit= line to /home/hatch/workspace/pig/mirror.log. Stay silent on success. Report the result; on failure report only and do NOT schedule any further retry.
