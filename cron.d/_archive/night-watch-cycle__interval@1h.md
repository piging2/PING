---
id: night-watch-cycle
title: Night watch cycle (temporary, overnight only)
enabled: true
owner: goal:ping-social-brand-launch
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-15T20:50:22
  every: 1h
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
Overnight watch cycle. Nolan is asleep until ~03:45 MDT. This cron is temporary and gets removed in the morning.

Do one checklist pass, then append a timestamped entry to ~/workspace/outreach/night-shift-2026-09-15.md:

1. PIG HEALTH: check CDP :9223 (Facebook), :9225 (X), :9226 (IG/Threads), :9227 (TikTok) — use ~/workspace/pig-fb/check_cdp.js style probes via the pig-ssh helpers. Dead Chrome → relaunch with the existing per-profile scripts/watchdogs. A session needing Nolan's manual login → note for the morning, no workarounds.
2. PASS RESULTS: find engagement-pass results newer than the last log entry (tiktok, instagram, threads, x, facebook, unfollow batches). Verify counts against caps and guard/ledger/history consistency. Record per-platform totals in the log.
3. TIKTOK: the 19:45 MDT pass ran at halved caps (30 likes + 10 comments) after an abort ("like button not found", then a possible-checkpoint abort). When its result is in: if likes executed cleanly, log the recovery and restore 60+20 in the tiktok-engagement-pass cron body for the next pass. If "like button not found" recurs, probe the like-button selector live on a real video: a TikTok layout change → fix the selector in ~/workspace/pig-fb/tk-engage.js, verify by actual state change, redeploy, log it; a soft like-block on the account → keep halved caps, log, flag for morning.
4. On ANY block/checkpoint/verification warning on any platform: fail closed, halve that platform's next-pass caps in its cron body, log it.
5. CONVERGENCE IMPROVEMENT LEG (standing objective, Nolan's directive): every cycle, advance the single highest-confidence convergence improvement by one step. Convergence means turning repeated agent reasoning into deterministic machinery: reasoning → rule → test → deterministic operation → auditable artifact. Hunt in: ~/workspace/skills/competitive-signal-pass/gap_ledger.json (anything marked AUTOMATABLE), repeated observations in tonight's log, anything you had to re-reason about from scratch this cycle. Rules: one improvement per cycle, max. Be bold only with reversible changes (new script plus a test, a new deterministic gate, a doc correction, a ledger classification). Anything touching live engagement drivers, cron bodies, outreach sends, credentials, sessions, or platform behavior gets written up as a PROPOSAL in the night log for morning review — never implemented overnight. Log what you considered, what you picked, and why in one short paragraph.

Hard boundaries: never bypass or work around a platform restriction; NEVER reboot the Pig, restart Docker, touch Windows Update, wipe any Chrome profile, or change credentials; no purchases, no publishing, no DMs or emails beyond the existing engine, no profile edits; never two drivers on the same account in one pass; never claim engagement without execution evidence. You monitor and improve — the engagement crons run their own passes.

Stay quiet. Your final message is a short cycle summary: time, what you checked, anything new, and the one improvement you advanced (or "none worth it this cycle"). If a manual login from Nolan is needed, flag NEEDS-NOLAN at the top of the final message; everything else lives in the log only.
