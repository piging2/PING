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
  every: 3h
timeout_secs: 14400
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Facebook engagement pass for PING Social outreach, executed through the always-on headed Chrome on Nolan's Pig workstation (2026-09-13 setup: Facebook cloud sessions die within minutes, so all Facebook actions run from the home IP via the Pig).

## CEO MODE VOLUME DIRECTIVE (2026-09-23, Nolan's binding order; supersedes all older volume notes for Facebook, including the Stage 0-4 schedule from earlier the same day)

Facebook ramps back up on Nolan's accelerated schedule (2026-09-23 ~13:52 MDT, comment ramp added ~13:54 MDT):
- NOW: 20 likes + 10 comments per pass, 3h cadence. (Pass 102, dispatched 2026-09-23 ~11:36 MDT and in flight under the old caps, completes normally; new caps apply from pass 103.)
- WEEKLY RAMP: +5 likes per pass each week (25, 30, 35...), up to the standing heavy ceiling of 75 likes per pass.
- COMMENTS: 10 per pass, +3 per week (13, 16, 19...), up to the standing 20/pass comment ceiling (2026-09-23 ~13:54 MDT, Nolan's order).
Rules: any checkpoint, warning, or restriction anywhere on Facebook drops volume immediately to 5 likes + 0 comments per pass with a 14-day hold before the weekly ramp can restart; the affected pass ends with zero further engagement and no retries. Track the current weekly caps in ~/workspace/outreach/facebook-engagement.md (20 likes + 10 comments set 2026-09-23).

STAY-ON RULE (2026-09-14, Nolan's standing directive): this schedule stays ENABLED unless there is a real blocker or a genuine flagged-account risk. A logged-out session, Pig unreachable, or CDP down are NOT reasons to disable: end the run with zero engagement, log it, and let the next pass retry. Disable only on: an actual account restriction, action block, checkpoint, or verification challenge that signals the account is flagged (then drop immediately to 5 likes + 0 comments per pass with a 14-day hold before the weekly ramp can restart, and surface it to Nolan immediately), or Nolan shutting off the Pig. Never disable for routine auth/infra hiccups.

LIKE-LIBERAL DIRECTIVE (2026-09-16, Nolan's order: scale back whatever causes flags, double down on what doesn't): likes are the safest engagement and the primary volume driver. Comments are scaled back (higher scrutiny). Publishing attempts are paused while the Page shows a silent publishing restriction (2026-09-16: 4 publish attempts, Post click swallowed with no error).
- LIKES (20 per pass, liberal selection within the cap, see the CEO MODE ramp schedule above; +5/week up to the standing 75/pass heavy ceiling): like generously from (a) Nolan's home feed (facebook.com home: friends, followed pages, groups), (b) anything local (Western Colorado people, pages, groups, Grand Junction area content), (c) the existing business/group discovery pool. Nolan's words: "just like everything, my home feed, anything local, just like like like." Do not overthink which posts deserve a like; if it is in the home feed or local and not objectionable, like it. Home-feed likes may include friends' personal posts (normal user behavior); the business-pages-only rule applies to comments, not likes.
- COMMENTS (10 per pass, +3/week up to the standing 20/pass comment ceiling): only the best opportunities, business Pages only, never personal profiles. Under 20 words, funny first, punchy, expert/techy but down to earth, post-specific. Never sell, no PING Social mention, no links, no contact info, no customer-posing, no em dashes. Prefer regular public feed posts (photos, carousels); only engage a reel if it visibly has public comments already.
- Pacing stays human: 60-120s between actions. Stop instantly on any checkpoint, action block, or verification challenge; any checkpoint, warning, or restriction anywhere on Facebook drops volume immediately to 5 likes + 0 comments per pass with a 14-day hold before the weekly ramp can restart, and the pass ends with zero further engagement and no retries; surface it to Nolan. Account safety outranks volume, always.

Nolan's directive 2026-09-13: DOUBLE DOWN on Facebook. It is where the home-service businesses flourish, so this channel gets maximum safe volume. (Superseded for now by the 2026-09-23 CEO MODE directive: volume returns only through the ramp schedule.)

MECHANICAL NEVER-RE-ENGAGE (2026-09-14): the never-re-engage rule (every Page/post ever handled is off-limits) is enforced inside ~/workspace/pig-fb/run_pass.sh by ~/workspace/outreach/engagement-guard.py, which filters the job file against the durable history in ~/workspace/outreach/facebook-engagement.md before anything is copied to the Pig. Blocked actions are stripped with a GUARD audit line in the log and reported as SKIPPED_REENGAGEMENT or BLOCKED. You MUST route every job through run_pass.sh; never copy a job to the Pig by any other path. The guard fails closed: if it cannot consult the history, the pass does not run.

ACTION INTENT (2026-09-14, states per Nolan's directive: ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION; terminals EXECUTED/FAILED/UNKNOWN_EXECUTION/NOT_ATTEMPTED): run_pass.sh writes one intent record per action to ~/workspace/outreach/action-intent-ledger.jsonl BEFORE anything is copied to the Pig, marks EXECUTION before delivery, and records each action's observation when the worker reports its result (EXECUTED/FAILED) or proves it never acted (NOT_ATTEMPTED). If a previous worker died between intent and observation, the next pass refuses those candidates as UNKNOWN_EXECUTION with the truthful reason: never silently skipped, never auto-retried, for any external commitment (like, comment, post, DM, email, form submit). Reconcile explicitly (`~/workspace/outreach/action-intent-ledger.py list-unknown`, then `reconcile`); it is a deliberate act, never automatic. Proof: ~/workspace/outreach/intent-crash-proof-2026-09-14.md.

Architecture: cloud brain, Pig hands. You do discovery and judgment here; the Pig performs the likes/comments.
- Discovery (read-only, safe from cloud): use the facebook-cli skill to browse (a) Nolan's home feed for like candidates, (b) local Western Colorado content, (c) Western Colorado home-service trade business Pages and public group posts (plumbing, HVAC, electrical, roofing, landscaping, garage doors, pest control, etc.) for comment candidates. Scan 15-20 groups plus business Page feeds per pass, 3-4 pages deep when the eligible pool is thin: the bottleneck is targets, not caps, so discovery breadth is the priority.
- Read ~/workspace/outreach/facebook-engagement.md first: header rules, voice, and the never-re-engage list (every Page/post ever handled is off-limits).
- Volume: 20 likes + 10 comments per pass (see the CEO MODE ramp schedule above). Parallelism: run through run_pass.sh once per pass; never two concurrent jobs on this account (interleaved actions break pacing and risk blocks).
- Write the job file to /tmp/fb-job-<timestamp>.json: { "actions": [ {"type":"like","url":"...","page":"Business Name"}, {"type":"comment","url":"...","page":"Business Name","text":"..."} ], "minDelaySec": 60, "maxDelaySec": 120 }. Use full post URLs and ALWAYS include the "page" business name on every action so the guard can check identity, not just the post URL. For home-feed likes on friends' posts, use the friend's name as "page".
- Execute: run `~/workspace/pig-fb/run_pass.sh /tmp/fb-job-<timestamp>.json`. It runs the never-re-engage guard first, then copies the filtered job to the Pig, runs the engagement worker there (60-120s human pacing between actions), and prints the result JSON. It waits as long as the pass takes. If the guard reports blocked actions, copy the SKIPPED_REENGAGEMENT / BLOCKED reasons into your pass log section.
- Infra outcomes (stay quiet, just log them): if run_pass.sh exits 2 (Pig unreachable, CDP down, result timeout, or guard fail-closed) or the result says logged_out, end the run with no user-facing message and note it in the log. Nolan's always-on Chrome window must stay running and minimized on the Pig; if it was closed or the Pig rebooted, the next pass will report logged_out and Nolan will need to log in again in that window.
- Safety: the worker stops the pass instantly on any checkpoint, action block, or verification challenge. If the result shows one, surface it to Nolan in one short line and log the immediate drop to 5 likes + 0 comments per pass with the 14-day hold. Account safety outranks volume, always.
- Post-pass verification: run `~/workspace/outreach/engagement-guard.py verify --platform facebook --report <report file>` on the completed actions (report includes the manifest path printed by the guard). Any VIOLATION is a real mistake: surface it to Nolan in one short line.

After the pass, append a dated pass section to ~/workspace/outreach/facebook-engagement.md: likes (Pages + post URLs), comments (verbatim text + post URL), skipped Pages and why (including guard-blocked ones), anomalies. Keep runs quiet: only surface to Nolan if there was an action block, checkpoint, login failure, guard fail-closed, or a verify VIOLATION; otherwise report only pass counts.

## SCHEDULER RESILIENCE (2026-09-17, automation-resilience program, Nolan's directive items 13/14/15)

NON-BLOCKING HARD RULE: no individual job, brief, surface, provider, or artifact can block unrelated work. A failure on one surface quarantines ONLY that surface (CAPABILITY=BLOCKED); every other schedule continues normally. This pass must never wait on, retry, or depend on the state of another platform's pass, another brief, or another artifact. Log your own outcome and move on.

RECOVERY BUDGETS (governing rule: ~/workspace/pig-fb/recovery-budgets.json v1.0.0; it owns the numbers, this body owns the behavior):
- Enumeration: up to 3 alternate strategies per pass on SUSPECT_ENUMERATION_FAILURE (zero candidates while the historical baseline is nonzero: try home-feed scan, then group scan, then business Page feeds), then classify ENUMERATION_FAILURE and quarantine the surface.
- Browser/CDP recovery: max 2 attempts per pass (a read-only probe, then one gentle recovery action), then DEPENDENCY_FAILURE, no hammering. The Pig commute blackout (~7am, ~4pm MT) is expected infra, not a failure.
- Authentication: max 2 attempts per pass (session restore, saved login), no credential entry, no waiting on a 2FA code, then AUTH_FAILURE and quarantine.
- Rate limit: stop instantly on any warning (unchanged); backoff 5m/10m/20m across passes, then a 24h quarantine; any warning drops volume immediately to 5 likes + 0 comments per pass with a 14-day hold before the weekly ramp can restart (this supersedes halving for Facebook); any checkpoint/warning/restriction pauses Facebook entirely for that pass, no retries. Backoff never shortens pacing or raises caps.
- Budget exhaustion quarantines the surface, never disables this schedule, never blocks other work. Force-kill of a live browser with session-loss risk is never automatic; it is Nolan's call.

PASS CLASSIFICATION: classify every pass outcome with the universal classifier (~/workspace/pig-fb/pass-classifier.js when it lands; until then write the class name verbatim in the pass log section): SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY, DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT, TEMPORARY_FAILURE, TERMINAL_FAILURE. Zero candidates with a nonzero baseline is SUSPECT_ENUMERATION_FAILURE: alternate enumeration, never a successful-empty mark.

YIELD-DRIVEN CADENCE (baseline interval for this schedule: 3h; failures never drive cadence, only genuine-empty passes do):
- Yield = actions landed (EXECUTED) per pass, read from ~/workspace/outreach/facebook-engagement.md and the action-truth store (~/workspace/outreach/action-truth.jsonl when it lands). Only passes classified SUCCESS_EMPTY or ELIGIBILITY_EMPTY with verified-healthy enumeration count toward the empty streak. Failure classes (AUTH_FAILURE, DEPENDENCY_FAILURE, RATE_LIMIT, ENUMERATION_FAILURE) do NOT count; they drive recovery budgets and the stay-on rule, not cadence.
- 3 consecutive genuine-empty passes: the next pass runs in LIGHT MODE (discovery-only at half breadth: half the groups/pages; Phase B executes only if eligible candidates appear). Log the light mode in the pass section.
- 5 consecutive genuine-empty passes: stretch this schedule's interval one step (3h -> 6h, max 12h) via cron.update and note it in the log. Reversible.
- Any pass landing >=1 action: restore the baseline 3h interval immediately via cron.update and exit light mode.
- Conservative by design: heavy mode is Nolan's standing order, so backoff is shallow (max 12h) and any success restores the baseline instantly. Never stretch on a warning; after a restriction clears, volume stays at 5 likes + 0 comments per pass with the 14-day hold per the CEO MODE ramp schedule above. Caps are governed by the CEO MODE weekly ramp, never by yield: a successful pass does not raise caps; the weekly +5 increase applies on schedule.
