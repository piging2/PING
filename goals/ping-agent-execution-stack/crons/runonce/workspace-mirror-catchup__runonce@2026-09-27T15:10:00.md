---
id: workspace-mirror-catchup
title: Workspace mirror catch-up (one-shot)
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-27T15:10:00
metadata:
  presentation_locale: en-US
---
One-shot catch-up for the failed workspace-to-Pig delta mirror (tunnel failure exit=12 on 2026-09-27 ~14:37 MDT). Execute /home/hatch/workspace/pig/mirror-workspace-to-pig.sh once (chunked rsync -az --delete to pigwsl:/home/nolan/workspace/ via pig-rsync.sh; per-chunk timings append to /home/hatch/workspace/pig/mirror.log). Report the result briefly. On failure: report only, stay silent otherwise, and do NOT schedule any further retry. Never restart, reboot, or reconfigure anything; never touch the Pig beyond the mirror script itself.
