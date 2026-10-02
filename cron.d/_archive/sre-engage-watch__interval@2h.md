---
id: sre-engage-watch
title: SRE engagement reliability watch
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T17:41:41
  every: 2h
delivery: []
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
SRE-ENGAGE periodic reliability watch (swarm command fleet).

SUPERSESSION NOTE (2026-09-24 ~19:00 MDT, Nolan's throttle order): the 2-DAY MAX SPRINT described below was SUPERSEDED. Nolan ordered outreach and engagement THROTTLED during the product sprint (conservative 6h cadences, low caps; no volume increase without his explicit order). As part of that throttle, cron `sprint-revert-2026-09-25` was INTENTIONALLY DISABLED (definition preserved). A disabled sprint-revert cron is therefore EXPECTED, not a threshold event — do not flag it. Do NOT re-enable it: its saved body would step volumes UP to natural-ramp levels, which would violate the throttle's no-increase rule. The 09:00 MDT Fri 2026-09-25 step-down is moot; volumes are already below it.

Original context (superseded, kept for the record): Nolan's engagement/outreach machinery was in a 2-DAY MAX SPRINT through Fri 2026-09-25 09:00 MDT, when cron `sprint-revert-2026-09-25` would have restored pre-sprint volumes/cadences.

Do, read-only:
1. Verify `sprint-revert-2026-09-25` exists and remains DISABLED (expected state per the throttle order). Flag only if it becomes ENABLED without Nolan's order.
2. Scan `cron.runs` for engagement/outreach jobs (facebook-engagement-pass, instagram-engagement-pass, tiktok, x, threads, discovery-research, meta-ai-intel-pass, outreach engine) for: restriction/checkpoint/warning language, 3+ consecutive failures on one job, stuck/missed runs.
3. Check the latest worker pass files only for restriction signals.

Report ONLY genuine threshold events: a new platform restriction/checkpoint/warning, a 3+ consecutive failure cluster, the sprint-revert cron becoming ENABLED without Nolan's order, or anything threatening the throttled steady state. Stay silent otherwise.

HARD RULES: never change volumes, caps, cadences, or schedules. Never edit MEMORY.md. Volume/cadence changes require Nolan's explicit order.

SELF-CLEANUP: if the current local time is past 2026-09-25 10:00 MDT, verify the revert did NOT run (expected: disabled per the throttle order), then remove this cron with cron.remove id `sre-engage-watch`, and report the final state.
