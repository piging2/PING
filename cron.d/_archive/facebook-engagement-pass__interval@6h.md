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
  every: 6h
timeout_secs: 10800
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
Facebook engagement pass for PING Social outreach, executed through the always-on headed Chrome on Nolan's Pig workstation (2026-09-13 setup: Facebook cloud sessions die within minutes, so all Facebook actions run from the home IP via the Pig).

STAY-ON RULE (2026-09-14, Nolan's standing directive): this schedule stays ENABLED unless there is a real blocker or a genuine flagged-account risk. A logged-out session, Pig unreachable, or CDP down are NOT reasons to disable: end the run with zero engagement, log it, and let the next pass retry. Disable only on: an actual account restriction, action block, checkpoint, or verification challenge that signals the account is flagged (then halve next-pass caps and surface it to Nolan immediately), or Nolan shutting off the Pig. Never disable for routine auth/infra hiccups.

RESTART NOTICE (2026-09-14): the account was locked 2026-09-13/14 and unlocked by Nolan; a cautious restart pass (Pass 42) ran clean with no blocks. For the next 2 passes (through end of 2026-09-15 MDT), run at REDUCED caps: max 25 likes + 7 comments per pass while the account rebuilds trust. After that, resume the full ceiling below. If any checkpoint, action block, or verification challenge appears during the reduced period, stop the pass and surface it to Nolan immediately.

Nolan's directive 2026-09-13: DOUBLE DOWN on Facebook. It is where the home-service businesses flourish, so this channel gets maximum safe volume.

MECHANICAL NEVER-RE-ENGAGE (2026-09-14): the never-re-engage rule (every Page/post ever handled is off-limits) is enforced inside ~/workspace/pig-fb/run_pass.sh by ~/workspace/outreach/engagement-guard.py, which filters the job file against the durable history in ~/workspace/outreach/facebook-engagement.md before anything is copied to the Pig. Blocked actions are stripped with a GUARD audit line in the log and reported as SKIPPED_REENGAGEMENT or BLOCKED. You MUST route every job through run_pass.sh; never copy a job to the Pig by any other path. The guard fails closed: if it cannot consult the history, the pass does not run.

ACTION INTENT (2026-09-14, states per Nolan's directive: ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION; terminals EXECUTED/FAILED/UNKNOWN_EXECUTION/NOT_ATTEMPTED): run_pass.sh writes one intent record per action to ~/workspace/outreach/action-intent-ledger.jsonl BEFORE anything is copied to the Pig, marks EXECUTION before delivery, and records each action's observation when the worker reports its result (EXECUTED/FAILED) or proves it never acted (NOT_ATTEMPTED). If a previous worker died between intent and observation, the next pass refuses those candidates as UNKNOWN_EXECUTION with the truthful reason: never silently skipped, never auto-retried, for any external commitment (like, comment, post, DM, email, form submit). Reconcile explicitly (`~/workspace/outreach/action-intent-ledger.py list-unknown`, then `reconcile`); it is a deliberate act, never automatic. Proof: ~/workspace/outreach/intent-crash-proof-2026-09-14.md.

Architecture: cloud brain, Pig hands. You do discovery and judgment here; the Pig performs the likes/comments.
- Discovery (read-only, safe from cloud): use the facebook-cli skill to browse Western Colorado home-service trade business Pages and public group posts (plumbing, HVAC, electrical, roofing, landscaping, garage doors, pest control, etc.). Business Pages only, never personal profiles. Prefer regular public feed posts (photos, carousels); only engage a reel if it visibly has public comments already. Scan 15-20 groups plus business Page feeds per pass, 3-4 pages deep when the eligible pool is thin: the bottleneck is targets, not caps, so discovery breadth is the priority.
- Read ~/workspace/outreach/facebook-engagement.md first: header rules, voice, and the never-re-engage list (every Page/post ever handled is off-limits).
- Volume: up to 50 likes + 15 comments per pass (Nolan's safety ceiling). Comments under 20 words, funny first, punchy, expert/techy but down to earth, post-specific. Never sell, no PING Social mention, no links, no contact info, no customer-posing, no em dashes.
- Write the job file to /tmp/fb-job-<timestamp>.json: { "actions": [ {"type":"like","url":"...","page":"Business Name"}, {"type":"comment","url":"...","page":"Business Name","text":"..."} ], "minDelaySec": 60, "maxDelaySec": 120 }. Use full post URLs and ALWAYS include the "page" business name on every action so the guard can check identity, not just the post URL.
- Execute: run `~/workspace/pig-fb/run_pass.sh /tmp/fb-job-<timestamp>.json`. It runs the never-re-engage guard first, then copies the filtered job to the Pig, runs the engagement worker there (60-120s human pacing between actions), and prints the result JSON. It waits as long as the pass takes. If the guard reports blocked actions, copy the SKIPPED_REENGAGEMENT / BLOCKED reasons into your pass log section.
- Infra outcomes (stay quiet, just log them): if run_pass.sh exits 2 (Pig unreachable, CDP down, result timeout, or guard fail-closed) or the result says logged_out, end the run with no user-facing message and note it in the log. Nolan's always-on Chrome window must stay running and minimized on the Pig; if it was closed or the Pig rebooted, the next pass will report logged_out and Nolan will need to log in again in that window.
- Safety: the worker stops the pass instantly on any checkpoint, action block, or verification challenge. If the result shows one, surface it to Nolan in one short line and halve the next pass's caps in the log. Account safety outranks volume, always.
- Post-pass verification: run `~/workspace/outreach/engagement-guard.py verify --platform facebook --report <report file>` on the completed actions (report includes the manifest path printed by the guard). Any VIOLATION is a real mistake: surface it to Nolan in one short line.

After the pass, append a dated pass section to ~/workspace/outreach/facebook-engagement.md: likes (Pages + post URLs), comments (verbatim text + post URL), skipped Pages and why (including guard-blocked ones), anomalies. Keep runs quiet: only surface to Nolan if there was an action block, checkpoint, login failure, guard fail-closed, or a verify VIOLATION; otherwise report only pass counts.
