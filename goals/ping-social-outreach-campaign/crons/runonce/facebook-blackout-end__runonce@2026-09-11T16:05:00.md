---
id: facebook-blackout-end
title: 'Facebook blackout end: re-enable Facebook crons'
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-11T16:05:00
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
The 24-hour Facebook browser blackout Nolan ordered on 2026-09-10 expired at 16:05 MDT on 2026-09-11. Nolan's standing decision (2026-09-10) is that Facebook engagement moves to the home-laptop remote browser ("option one", ~/workspace/outreach/home-laptop-browser-plan.md); the cloud browser is only a fallback until the laptop path is live. Nolan also directed on 2026-09-11 to ramp up Facebook starting 16:05.

Step 1: check whether ~/workspace/outreach/laptop-browser-live.md exists and says the laptop path is operational.
- If the laptop path is LIVE: leave the cloud-browser facebook-engagement-pass and facebook-session-watch crons DISABLED (do not re-enable them). Run the first Facebook engagement pass through the laptop path following the instructions in the marker file, at warm-up limits (10 likes, 2 to 3 comments max, 60 to 120 seconds between actions, stop instantly on any warning). Log results to ~/workspace/outreach/facebook-engagement.md. Final message: one line on the laptop pass result.
- If the laptop path is NOT live: attempt ONE cautious cloud-browser re-entry as the fallback so the 16:05 ramp still starts. Single login via the saved session (one restore attempt only; if restore fails or crashes, stop and report). Then a warm-up pass only: at most 10 likes and 2 to 3 comments, 60 to 120 seconds between every action, stop instantly on any action block, "try again later", checkpoint, verification challenge, or warning of any kind. During the pass, note legitimate public signals (new businesses, openings, service announcements, hiring or growth signals, community activity, website or contact problems, customer complaints, business changes) and feed them into the prospect records in the canonical CSV; do not create a separate Facebook schedule. If the session dies within minutes again: do NOT re-enable anything; leave both Facebook crons disabled; record the outcome in ~/memory/2026-09-11.md; the home-laptop path remains the primary route and the next attempt waits for it. If the warm-up completes cleanly with the session stable: re-enable facebook-session-watch and facebook-engagement-pass via cron.update (enabled true) and continue the ramp from there. Final message: one line saying what happened and what is now enabled, or surface any error that prevented it.
