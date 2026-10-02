---
id: ping-pipeline-reconcile
title: PING pipeline reconciliation
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-14T16:03:27
  every: 6h
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
PING pipeline reconciliation watchdog (antifragility mandate, 2026-09-14). Detect missing work: the absence of an expected transition is itself evidence.

1. Before anything else, note this run's start time T0 (UTC ISO, e.g. `date -u +%Y-%m-%dT%H:%M:%SZ`). You need it in step 5.
2. Run `python3 ~/workspace/tandem/reconcile.py` (exit 0 = no gaps, 2 = gaps found, 3 = checks could not run). It reads ONLY existing machinery: the run ledger (runs.jsonl), provenance sidecars, ingested.log, sweep summaries, and the ping_events table. It creates no database, no authority, no event store.
3. The run writes a timestamped report to ~/workspace/tandem/reconciliation/ and refreshes LATEST.json. That file is the durable record; the outreach engine's next pass reads it and closes open R2/R5 gaps.
4. Stay quiet on a clean run: do NOT message Nolan. A clean reconciliation is routine, not news.
5. Chronic DISTILL-gap lifecycle (Nolan directive 2026-09-26, authoritative lifecycle decision going forward; supersedes the old "note it at 3 consecutive reports" behavior for DISTILL gaps): after reconcile.py writes its report, run `python3 ~/workspace/tandem/chronic-distill-close.py --apply`. It scans the reconciliation history and records a terminal `skipped` decision through the existing mark-distill-closed.sh mechanism for any DISTILL gap (rule R2, step DISTILL ONLY; never generalized to other gap/lifecycle types) that has recurred across >= 4 consecutive reconciliation reports AND is >= 36 hours old and remains unresolved. Evidence is preserved in the sidecar's transition log (recurrence history, age, authority); reconciliation history and gap-lifecycle.json are never rewritten by it. The next reconcile run observes the terminal sidecar and resolves the lifecycle record itself. If the closer reports a refusal or failure, note it in the run record and stay quiet (do not page Nolan); never hand-edit sidecars. For NON-DISTILL gaps the old behavior stands: if the same gap appears in 3 consecutive reconciliation reports (nobody is closing it), note that explicitly in the run report so it becomes visible.
6. Scheduler tick coverage (2026-09-14 loop-health audit: the script reads artifacts, not the scheduler, so a tick that never fires leaves no trace in its rules; 2026-09-27: expected ticks come from the LIVE schedule contract, never hardcoded intervals/anchors). After step 2 completes: (a) build a run-records JSON file mapping each watched job id (meta-ai-intel-pass, ping-social-outreach-engine) to the list of its scheduler run start timestamps (ISO) since the previous reconciliation report, taken from the scheduler's run history; (b) run `python3 ~/workspace/tandem/scheduler-tick-coverage.py --run-records <file> --before <T0>` where T0 is the start time from step 1. The script deterministically uses the newest reconcile report with checked_at strictly before T0 as the window start, which excludes this run's own report (written by step 2). NEVER compute the window start yourself and never pass --since as a substitute: --since is a genuine override only, and a hand-picked --since is how phantom windows were created before. The script reads each job's interval, anchor, kind, and enabled flag from the LIVE cron definition files (workspace/cron.d, workspace/goals/*/crons, workspace/system-cron.d, excluding _archive) as the single source of truth: if a job's schedule changed, expectations follow automatically. NEVER hardcode an interval or anchor in this body or anywhere else in the flow. Append each missing tick to the reconciliation report (both the .md and the .json, and bump gap_count in LATEST.json) as rule R7, step SCHEDULE, state GAP, with the expected tick time and the note "dispatch gap: tick never queued (or job was disabled at tick time); no worker failure. Rotation retry and watermark ingest cover the work; this record is the visibility." If the script reports a job UNCHECKABLE/UNCHECKED (typed reason: definition missing/ambiguous/unreadable, unsupported kind, or no previous report to bound the window), record that as an R7 SCHEDULE UNCHECKED note: never a phantom gap, never silent coverage. A single missed tick is recorded quietly under the step-4/stay-quiet rule; the step-5 three-consecutive rule applies to R7 gaps as well.

STAY-ON RULE: this schedule stays ENABLED through ordinary auth, Pig-connectivity, or gateway hiccups. A failed probe records UNCHECKED, it never disables the watchdog. Disable only on Nolan's explicit order.
