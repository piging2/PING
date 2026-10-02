---
id: ping-page-daily-post
title: PING Page daily post draft
enabled: true
owner: goal:ping-social-brand-launch
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 08:21:00
delivery:
  - chat_id: 76d7c127-fea6-44d1-a77e-1665978229c6
metadata:
  tags: [cron:flexible-time]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
Daily PING Social Facebook Page post draft. Nolan approved daily-approval mode on 2026-09-29: this job drafts, Nolan approves in chat, then a publish/schedule happens on his word. Never publish or schedule from this job.

1. Pull fresh numbers: `facebook-cli pages account-insights --page-id 1262592440277855 --time-range LAST_7D` and `facebook-cli pages posts list --page-id 1262592440277855 --time-range LAST_28D --limit 10`. Preserve exact returned metric nouns and values; compare per-post views, engagements, engagements_including_clicks, clicks, link_clicks, saves to identify the current winner pattern (format, hook, topic). Never invent metrics; an unavailable metric stays unavailable.
2. Format rotation (Nolan 2026-09-29): range every post from short text-only (tweet-length) through pig-image posts to longer video. Rotate formats across days; do not post the same format twice in a row.
   - Text or image day: draft exactly ONE post, text at most 1024 characters, no em dashes. It must pass the CONTENT HUMOR CHECK gate in ~/workspace/ping-content/captions.md (funny native to the PING brand, never bolted on; the post still works if the joke is ignored). Practical business outcomes for home service shops, never AI hype. Image days: pick one unposted pig image from ~/workspace/ping-content/inbox/ (read "posted" flags and posted_at dates in ~/workspace/ping-content/queue.json; prefer unposted queue items; never reuse an image posted within the last 14 days). Only the exact PING pig: smooth metallic gold head, large rounded gold ears with purple inner ears, glossy dark purple-black eyes, purple snout with darker purple cheek stripes, gold hands, purple suit with gold trim, tall and slender, never generic or fat.
   - Video day: do NOT attempt to render video from this job. Deliver a complete video package: script with shot list, a voiceover script written for Nolan's own voice, and editing notes for a PROFESSIONAL DaVinci Resolve edit (clean cuts, polished captions, sharp feel; Nolan corrected 2026-09-29 that "amateur" was facetious, never amateur). Short-form craft is core: hooks, pacing, captions. Note: Nolan's voice clone works on short paragraphs (corrected 2026-09-29; the 9/19 pause is stale); the newer CosyVoice container path on the Pig is still being proven, never claim it is ready.
3. Do NOT create a Facebook draft, publish, or schedule anything. Deliver to the main chat: the full caption text or video package, the chosen image attached on image days, and 2-4 lines on which metric pattern the draft follows and why.
4. Append one observation line (date, metrics pulled, format, theme, image chosen) to ~/memory/YYYY-MM-DD.md for the current date.
