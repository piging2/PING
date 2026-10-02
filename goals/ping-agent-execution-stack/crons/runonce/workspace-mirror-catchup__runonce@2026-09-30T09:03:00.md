---
id: workspace-mirror-catchup
title: Workspace mirror catch-up retry
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-30T09:03:00
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
One-shot catch-up retry for the workspace-to-Pig delta mirror after the 2026-09-30 08:26 MDT scheduled run failed with tunnel exit=12 (first consecutive failure). Execute /home/hatch/workspace/pig/mirror-workspace-to-pig.sh once (chunked rsync -az --delete via the pig-rsync.sh tunnel, same as the scheduled job). Report the result: success stays quiet, failure reports the last 20 lines of /home/hatch/workspace/pig/mirror.log. On failure report ONLY and do NOT schedule any further retry.
