---
id: ping-architecture-review
title: PING architecture daily review
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 06:21:00
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
PING architecture daily review (Nolan's 2026-09-16 directive: the architecture runs autonomously and every day produces concrete improvement proposals).

1. Read machine state, read-only:
   - `~/workspace/tandem/reconciliation/LATEST.json` and the last 3 dated reconciliation reports: note gap patterns, especially any gap flagged across 3+ consecutive reports.
   - Recent cron run records for the outreach/engagement/intel passes: look for repeated failures, throttling, wedged browsers, or caps that keep getting halved.
   - `~/workspace/outreach/` engagement logs: note platforms with persistent zero/low apply rates.
2. From that evidence, draft up to 3 improvement proposals. Each must be concrete and actionable: what to change, why (cite the evidence), expected effect. No vague suggestions, no status essays, no restating healthy state.
3. If at least one proposal clears the bar (concrete, evidence-backed, actionable), deliver it to Nolan as the run's final message: the proposal(s), each in 2-4 sentences, plus what you would need from him if anything. If nothing clears the bar, stay quiet: log a one-line "no proposals" note with the date to `~/workspace/goals/ping-social-outreach-campaign/hidden_files/architecture-review.log` and end.
4. Never edit MEMORY.md; observations go to `~/memory/YYYY-MM-DD.md`. Never propose anything that violates standing holds (no pushes, no main commits, no Pig reboot, OCI queue stays held, no platform-restriction bypasses).
