---
id: instagram-engagement-pass
title: Instagram engagement pass
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-13T11:01:43
  every: 4h
timeout_secs: 3600
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Dedicated Instagram engagement pass for PING Social outreach (Nolan's 2026-09-13 instruction: run engagement passes every few hours).

Steps:
1. Read ~/workspace/outreach/instagram-engagement.md first: the header rules and the never-re-engage account list (every handle ever liked or commented on is off-limits for future passes).
2. Spawn a browser task for Instagram as nolanpigi: verify signed in first (restore saved session if logged out; session holds reliably). If login cannot be restored, stop with zero engagement and report it.
3. Engage Western Colorado home-service trade business accounts only (plumbing, HVAC, electrical, roofing, landscaping, garage doors, pest control, etc.). Business accounts only, never personal profiles.
4. Prefer regular public feed posts (photos, carousels) over reels; only engage a reel if it visibly has public comments already.
5. Volume: up to 25 likes plus a handful of comments per pass. Human pacing: 60 to 120 seconds between actions. View each post fully before engaging.
6. Comment voice: under 20 words, funny first, then punchy, expert/techy but down to earth, post-specific. Never sell, never mention PING Social, no links, no contact info, no customer-posing, no em dashes.
7. Stop instantly on any action block, checkpoint, verification challenge, or warning, and report it. Never like or comment on the same account/post twice across passes.
8. While engaging, also note discovery: new Western Colorado trade business handles worth prospecting go into ~/workspace/outreach/instagram-prospects.md with a one-line note.

After the pass, append a dated pass section to ~/workspace/outreach/instagram-engagement.md: pass number, likes (handles + post URLs), comments (verbatim text + post URL), skipped accounts and why, any anomalies. Keep runs quiet: only surface to Nolan in the final message if there was an action block, checkpoint, or login failure; otherwise report only the pass counts.
