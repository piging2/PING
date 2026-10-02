---
id: automation-health-report
title: Automation health report
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: daily
  timezone: America/Denver
  time: 07:30:00
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Daily automation health report for Nolan's automation-resilience program (Nolan's 2026-09-17 directive, item 16; he explicitly authorized this daily recurrence).

Run `~/workspace/outreach/automation-health-report.sh` exactly once. The script is strictly read-only: it never writes, deletes, or changes any state. Do not modify any file, cron definition, or state store while generating the report; if the script errors, report the error text instead of improvising.

Report the script's full stdout verbatim as your final message. That report text is the entire deliverable: do not summarize it away, do not append extra commentary, and do not open any other thread or message about it. The report already follows Nolan's exact format (AUTOMATION HEALTH header, per-platform sections, SYSTEM section).
