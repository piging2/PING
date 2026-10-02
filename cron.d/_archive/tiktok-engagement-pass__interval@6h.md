---
id: tiktok-engagement-pass
title: TikTok engagement pass
enabled: true
owner: goal:ping-social-brand-launch
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-15T19:45:00
  every: 6h
timeout_secs: 7200
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
## PRODUCT SPRINT THROTTLE (2026-09-24, Nolan: product proof is P0)

Outreach and engagement are THROTTLED during the FYD product sprint. This pass: schedule every 6h, caps 10 likes + 3 comments per pass. Do not increase volume or cadence; restore only on Nolan's explicit order. All safety rails, guard, intent ledger, pacing, and fail-closed rules below are unchanged.

TikTok engagement pass for PING Social brand building (Nolan's 2026-09-15 directive: TikTok too, same playbook as the other platforms). Account: @nolanpigi.

## CEO MODE VOLUME DIRECTIVE (2026-09-23, Nolan, standing; THROTTLED 2026-09-24 for the product sprint)

The TikTok action path is proven end to end. Evidence 2026-09-23: pass 47 and pass 48 each landed 1/1 comment cleanly (logged_in:true, driver ran the single comment cleanly in ~46s and ~41s, no checkpoint or verification warning, guard verify 0 violations); comment scoreboard 51 applied of 58 attempted; likes 8 applied of 31 attempted. THROTTLED for the sprint: up to 10 likes + 3 comments per pass. The 60+20 heavy ceiling is suspended for the sprint; the 2026-09-16 like suspension pending Nolan's review is superseded by the 2026-09-23 directive. Safety rails unchanged: stop instantly on any warning, verification nudge, self-abort, or sign of reduced reach; any warning halves next-pass caps and is surfaced to Nolan; human pacing 60-120s between actions; ONE driver at a time on the TikTok Chrome. The first throttled pass watches for rate-limit signals; on any signal, stop, halve, and surface.

STAY-ON RULE: this schedule stays ENABLED unless there is a real blocker or a genuine flagged-account risk. A down CDP, a logged-out TikTok session, or the Pig being unreachable are NOT reasons to disable: end the run with zero engagement, log it, and let the next pass retry. Disable only on: an actual account restriction, action block, checkpoint, or verification challenge that signals the account is flagged (then halve next pass's caps per step 7 and surface it to Nolan immediately), or Nolan saying stop.

MECHANICAL NEVER-RE-ENGAGE: prose is not the enforcement. The guard script ~/workspace/outreach/engagement-guard.py (tiktok-capable) consults the durable history in ~/workspace/outreach/tiktok-engagement.md. The steps below are mandatory; an LLM that forgets the rule still cannot engage a blocked video.

Environment: export ENGAGEMENT_GUARD_PASSES_DIR=~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes before calling the guard or ledger scripts, so TikTok manifests live under the brand-launch goal.

Steps:
1. Read ~/workspace/outreach/tiktok-engagement.md header rules first.
2. Phase A, discovery only (read-only, no browser, no likes): use web search (browser_search) to find recent TikTok video URLs from tech leaders, founders, builders, and tech/startup content creators ONLY (trades targeting was dropped 2026-09-15). Search angles: "ai tools tiktok", "startup founder tiktok", "coding tips tiktok", "tech review tiktok". Collect URLs in https://www.tiktok.com/@<handle>/video/<id> form; the handle must come from the URL itself (never guess handles). Prefer videos from the last 7 days; skip obvious ads/sponsored content and personal non-business profiles. Write candidates to ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/tiktok-candidates-<timestamp>.json as [{"account":"@handle","url":"https://www.tiktok.com/@<handle>/video/<id>","type":"like|comment","text":"<comment text for comment actions>"}, ...]. Plan up to 10 likes; pair up to 3 comments on the strongest videos (like+comment pairs on one video are allowed by the guard's within-pass dedup, which keys on identity+action). Comment voice: smart, specific, funny, under ~20 words, reacting to something specific in the video; natural @mentions where fitting. NEVER sell, no PING Social mention, no links, no contact info.
3. Run the guard: `~/workspace/outreach/engagement-guard.py filter --platform tiktok --in <candidates file> --out <eligible file> --audit`. It consults the durable history and classifies each candidate ELIGIBLE / ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE. Only ELIGIBLE candidates go in the eligible file; the rest are logged as SKIPPED_REENGAGEMENT or BLOCKED with reasons. Note the manifest path from the filter summary output. If the guard exits 3 (history uncheckable), FAIL CLOSED: end the pass with zero engagement, log the fail-closed, keep the schedule enabled. If zero candidates are eligible, log it and end the pass quietly.
3b. Unknown-execution filter: run `~/workspace/outreach/action-intent-ledger.py refuse --platform tiktok --in <eligible file> --out <final file> --pass-id tiktok-<timestamp>` using the same <timestamp> as the candidates file. It refuses any candidate whose account has an unresolved intent from an older pass with a truthful UNKNOWN_EXECUTION reason, never silently skipping. If it exits 3 (ledger unreadable), FAIL CLOSED: end the pass with zero engagement and log it. If zero candidates remain, log it and end quietly. Copy refused UNKNOWN_EXECUTION entries into the pass log section; they need explicit reconciliation, not a retry.
4. Phase B, engagement only: write the closed job set to ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/tiktok-job-<timestamp>.json as {"actions":[{"type":"like|comment","url":"...","text":"..."}, ...],"minDelaySec":60,"maxDelaySec":120}, up to 10 likes + 3 comments, built from the final file.
4b. Intent before action: BEFORE Phase B starts, run `~/workspace/outreach/action-intent-ledger.py write-intents --platform tiktok --in <final file> --out <final file> --pass-id tiktok-<timestamp>` — wait, use the same <timestamp> as the candidates file. It refuses any candidate whose account has an unresolved intent from an older pass with a truthful UNKNOWN_EXECUTION reason, never silently skipping. If it exits 3 (ledger unreadable), FAIL CLOSED: end the pass with zero engagement and log it. If zero candidates remain, log it and end quietly. Copy refused UNKNOWN_EXECUTION entries into the pass log section; they need explicit reconciliation, not a retry.
5. Restart safety: after the run, transform the runner's results into a per-action outcomes report [{"account":"@handle","url":"...","action":"like|comment","ok":true/false,"note":"..."}]. For each completed (ok=true) action call `~/workspace/outreach/engagement-guard.py record --platform tiktok --account <handle> --url <video url> --action like|comment`, so the durable log reflects reality immediately. Then record outcomes: `~/workspace/outreach/action-intent-ledger.py record-outcomes --platform tiktok --pass-id tiktok-<timestamp> --outcomes-json <outcomes report>`. Outcomes close intents; a crash between intent and outcome leaves UNKNOWN_EXECUTION, which the next pass refuses until reconciled (never auto-retried).
6. Engagement rules: tech leaders/founders/builders/tech content ONLY. Likes AND comments. Volume: up to 10 likes + 3 comments per pass (product-sprint throttle, 2026-09-24 Nolan directive: product proof is P0). Human pacing: 60 to 120 seconds between actions (enforced by the runner). Never exceed caps. ONE driver at a time on the TikTok Chrome; parallelize across platforms, never within a pass. TikTok's bot detection is aggressive: never burst, never act on ads, and treat any "slow down" or verification nudge as a full stop.
7. Stop instantly on any action block, checkpoint, verification challenge, rate-limit warning, or any sign of reduced reach, and report it: a blocked account produces zero metrics, so backing off is the priority over volume. If a warning ever appears, halve the next pass's caps and note it in the log.
8. Post-pass verification: build a report file {"actions": [...], "manifest": "<manifest path from step 3>"} from the outcomes report and run `~/workspace/outreach/engagement-guard.py verify --platform tiktok --report <report file>`. The manifest pins the pre-pass snapshot; without it every recorded action would read as a violation. Any VIOLATION (an action that was not ELIGIBLE at selection time) is a real mistake: surface it to Nolan in the final message.

After the pass, append a dated pass section to ~/workspace/outreach/tiktok-engagement.md: pass number, likes and comments (handles + video URLs), skipped accounts and why (including guard-blocked ones), any anomalies. Keep runs quiet: only surface to Nolan in the final message if there was an action block, checkpoint, login failure, guard fail-closed, or a verify VIOLATION; otherwise report only the pass counts.

## SCHEDULER RESILIENCE (2026-09-17, automation-resilience program, Nolan's directive items 13/14/15)

NON-BLOCKING HARD RULE: no individual job, brief, surface, provider, or artifact can block unrelated work. A failure on one surface quarantines ONLY that surface (CAPABILITY=BLOCKED); every other schedule continues normally. This pass must never wait on, retry, or depend on the state of another platform's pass, another brief, or another artifact. Log your own outcome and move on.

RECOVERY BUDGETS (governing rule: ~/workspace/pig-fb/recovery-budgets.json v1.0.0; it owns the numbers, this body owns the behavior):
- Enumeration: up to 3 alternate strategies per pass on SUSPECT_ENUMERATION_FAILURE (zero candidates while the historical baseline is nonzero: try alternate search angles, then seed-handle video scan, then retry-eligible handles from recent passes), then classify ENUMERATION_FAILURE and quarantine the surface.
- Browser/CDP recovery: max 2 attempts per pass (a read-only probe, then one gentle recovery action), then DEPENDENCY_FAILURE, no hammering. TikTok bot detection is aggressive: treat any "slow down" or verification nudge as a full stop, not a retry signal.
- Authentication: max 2 attempts per pass (session restore), no credential entry, no waiting on a 2FA code, then AUTH_FAILURE and quarantine.
- Rate limit: stop instantly on any warning (unchanged); backoff 5m/10m/20m across passes, then a 24h quarantine; halve next-pass caps on every warning (unchanged). Backoff never shortens pacing or raises caps. The 2026-09-16 like suspension is lifted by the 2026-09-23 CEO MODE directive; any warning still halts and halves, and the first heavy-ceiling pass watches for rate-limit signals.
- Budget exhaustion quarantines the surface, never disables this schedule, never blocks other work.

PASS CLASSIFICATION: classify every pass outcome with the universal classifier (~/workspace/pig-fb/pass-classifier.js when it lands; until then write the class name verbatim in the pass log section): SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY, DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT, TEMPORARY_FAILURE, TERMINAL_FAILURE. Zero candidates with a nonzero baseline is SUSPECT_ENUMERATION_FAILURE: alternate enumeration, never a successful-empty mark.

YIELD-DRIVEN CADENCE (baseline interval for this schedule: 6h, throttled 2026-09-24 for the product sprint; failures never drive cadence, only genuine-empty passes do):
- Yield = actions landed (EXECUTED) per pass, read from ~/workspace/outreach/tiktok-engagement.md and the action-truth store (~/workspace/outreach/action-truth.jsonl when it lands). Only passes classified SUCCESS_EMPTY or ELIGIBILITY_EMPTY with verified-healthy enumeration count toward the empty streak. Failure classes (AUTH_FAILURE, DEPENDENCY_FAILURE, RATE_LIMIT, ENUMERATION_FAILURE) do NOT count; they drive recovery budgets and the stay-on rule, not cadence. Driver self-aborts with logged_in:true and no user-visible challenge count as RATE_LIMIT signals, not genuine-empty.
- 3 consecutive genuine-empty passes: the next pass runs in LIGHT MODE (discovery-only at half breadth; Phase B executes only if eligible candidates appear). Log the light mode in the pass section.
- 5 consecutive genuine-empty passes: stretch this schedule's interval one step (6h -> 12h, max 24h) via cron.update and note it in the log. Reversible.
- Any pass landing >=1 action: restore the baseline 6h interval immediately via cron.update and exit light mode.
- Conservative by design: heavy mode is Nolan's standing order, so backoff is shallow (max 24h) and any success restores the baseline instantly. Never stretch on a warning; after a restriction clears, caps stay halved per the existing rule until a clean pass lands.
