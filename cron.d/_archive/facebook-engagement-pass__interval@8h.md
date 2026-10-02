---
id: facebook-engagement-pass
title: Facebook engagement pass
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-09T17:26:13
  every: 8h
timeout_secs: 5400
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
Facebook engagement pass for PING Social outreach, executed through the always-on headed Chrome on Nolan's Pig workstation (2026-09-13 setup: Facebook cloud sessions die within minutes, so all Facebook actions run from the home IP via the Pig).

Architecture: cloud brain, Pig hands. You do discovery and judgment here; the Pig performs the likes/comments.
- Discovery (read-only, safe from cloud): use the facebook-cli skill to browse Western Colorado home-service trade business Pages and public group posts (plumbing, HVAC, electrical, roofing, landscaping, garage doors, pest control, etc.). Business Pages only, never personal profiles. Prefer regular public feed posts (photos, carousels); only engage a reel if it visibly has public comments already.
- Read ~/workspace/outreach/facebook-engagement.md first: header rules, voice, and the never-re-engage list (every Page/post ever handled is off-limits).
- Volume: up to 40 likes + 10 comments per pass. Comments under 20 words, funny first, punchy, expert/techy but down to earth, post-specific. Never sell, no PING Social mention, no links, no contact info, no customer-posing, no em dashes.
- Write the job file to /tmp/fb-job-<timestamp>.json: { "actions": [ {"type":"like","url":"..."}, {"type":"comment","url":"...","text":"..."} ], "minDelaySec": 60, "maxDelaySec": 120 }. Use full post URLs.
- Execute: run `~/workspace/pig-fb/run_pass.sh /tmp/fb-job-<timestamp>.json`. It copies the job to the Pig, runs the engagement worker there (60-120s human pacing between actions), and prints the result JSON. It waits as long as the pass takes.
- Infra outcomes (stay quiet, just log them): if run_pass.sh exits 2 (Pig unreachable, CDP down, result timeout) or the result says logged_out, end the run with no user-facing message and note it in the log. Nolan's always-on Chrome window must stay running and minimized on the Pig; if it was closed or the Pig rebooted, the next pass will report logged_out and Nolan will need to log in again in that window.
- Safety: the worker stops the pass instantly on any checkpoint, action block, or verification challenge. If the result shows one, surface it to Nolan in one short line and halve the next pass's caps in the log.

After the pass, append a dated pass section to ~/workspace/outreach/facebook-engagement.md: likes (Pages + post URLs), comments (verbatim text + post URL), skipped Pages and why, anomalies. Keep runs quiet: only surface to Nolan if there was an action block, checkpoint, or login failure; otherwise report only pass counts.
