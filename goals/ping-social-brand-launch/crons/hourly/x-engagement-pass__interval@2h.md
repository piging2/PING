---
id: x-engagement-pass
title: X engagement pass
enabled: true
owner: goal:ping-social-brand-launch
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-15T21:14:03
  every: 2h
timeout_secs: 7200
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
## X AUDIENCE-GROWTH RAMP (2026-09-25 Nolan directive; NO-SCALE-BACK 2026-09-26)

Nolan's standing order: grow the X audience via the BROWSER route only, prioritizing follows and thoughtful comments, with likes as supporting engagement. Zero API usage for active engagement (the API path stays off). Per-pass caps: max 5 follows + 3 comments + 10 likes. Cadence: every 2h. Weekly ramp: +1 follow / +1 comment / +5 likes per week from these caps, no ceiling (2026-09-26). A failed pass is retried, never answered with lower caps. Any checkpoint, warning, restriction, or rate-limit signal stops the pass and is surfaced to Nolan; the next pass resumes at the ramped caps. Never halve caps, never pause the ramp.

Route: the Pig's headed X Chrome (x-profile, CDP :9225), logged in as @GeskeNolan. No API engagement ever. No headless engagement. Read-only research stays on.

STAY-ON RULE: this schedule stays ENABLED unless there is a real blocker or a genuine flagged-account risk. A down CDP, a logged-out X session, or the Pig being unreachable are NOT reasons to disable: end the run with zero engagement, log it, and let the next pass retry. Disable only on: an actual account restriction, action block, checkpoint, verification challenge that signals the account is flagged (then surface it to Nolan immediately; caps are never halved), or Nolan saying stop.

MECHANICAL NEVER-RE-ENGAGE: prose is not the enforcement. The guard script ~/workspace/outreach/engagement-guard.py (x-capable: like, comment, follow) consults the durable history in ~/workspace/outreach/x-engagement.md. The steps below are mandatory; an LLM that forgets the rule still cannot engage a blocked account.

Target sources (fresh, researched 2026-09-25):
- Follow queue: ~/workspace/goals/ping-social-brand-launch/hidden_files/x-follow-targets.txt (46 verified handles, one per line)
- Target notes + buckets: ~/workspace/goals/ping-social-brand-launch/hidden_files/x-growth-targets-2026-09-25.md
- Comment voice: ~/workspace/goals/ping-social-brand-launch/hidden_files/x-comment-voice.md (hard gate before drafting)

Priority comment targets (engaged SMB owners, highest reply odds): @SamtLeslie, @SMB_ChrisH, @StrongpointRich, @tone2k18, @wilsoncompanies, @thehvacjack, @AizikZimerman. Rotate through these first; fall back to B3/B1 buckets from the notes file.

Environment: export ENGAGEMENT_GUARD_PASSES_DIR=~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes before calling the guard or ledger scripts, so X manifests live under the brand-launch goal.

Steps:
1. Read ~/workspace/outreach/x-engagement.md header rules first.
2. Phase A, candidate building (read-only; always allowed).
   a. FOLLOWS: read the follow-targets.txt queue from the top; take the first handles not already engaged (the guard decides in step 3), up to 5. Never re-queue a handle the guard flags ALREADY_ENGAGED. Write to ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/x-follow-queue-<timestamp>.txt (one handle per line, no @).
   b. COMMENTS + LIKES need post URLs. PRIMARY ROUTE (non-API, browser): run `~/workspace/pig-fb/x-probe-discover.sh <handle1,handle2,...> 48 <out.json>` against up to 5 priority comment-target handles — this is the ONLY supported way to launch the probe. Do NOT hand-roll the bridge invocation: the probe must run Windows-side via the x-discover-run.ps1 wrapper (WSL cannot reach the 127.0.0.1-bound CDP :9225, there is no node.exe on the Windows PATH, and C:/Windows/Temp is not a valid WSL path). The launcher preflights CDP :9225 and exits 4 if the X Chrome window is closed — that is a stay-on-rule zero-engagement outcome, not a disable condition. The probe run is bounded (120s + 600s per handle); a stall prints TIMEOUT and exits 6. Any nonzero launcher exit is FAIL-CLOSED for the comment/like leg: log it, skip to the follow leg if follows are still viable, otherwise end the pass quietly. The probe is read-only (page loads + scrolls, no clicks). Convert the probe's {"results":[{account,url,posted_at}]} into the candidates file at ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/x-candidates-<timestamp>.json. Prefer posts from the last 48h; skip obvious ads. Select up to 3 comment candidates (one post each, priority targets first) and up to 10 like candidates (distinct posts; a post already selected for comment may also be liked only if it is a different action on a different pass — never like+comment the same post in one pass).
   c. Draft one comment per comment candidate following x-comment-voice.md exactly. Each comment goes in its own UTF-8 file under ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/x-comment-<timestamp>-<n>.txt. Reject any draft that sells, mentions PING, links, poses as a customer, or exceeds 20 words without earning it.
   FALLBACK when the browser probe route is down (CDP down, Pig unreachable): the comment/like leg is skipped for this pass (no API engagement ever, no headless). The follow leg may still run if the X Chrome is up. Log the skip and continue.
   TIME-BUDGET GUARD: if Phase A browser-probe attempts have consumed more than 45 minutes total in this pass without producing a candidate file, do NOT launch another probe. End the comment/like leg quietly; the follow leg may still run.
3. Run the guard on each leg: `~/workspace/outreach/engagement-guard.py filter --platform x --in <candidates file> --out <eligible file> --audit`. For follows, the candidates file is [{"account":"@handle"}] per queue line. It consults the durable history and classifies each candidate ELIGIBLE / ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE. Only ELIGIBLE candidates proceed; the rest are logged as SKIPPED_REENGAGEMENT or BLOCKED with reasons. Note the manifest path from the filter summary output. If the guard exits 3 (history uncheckable), FAIL CLOSED: end the pass with zero engagement, log the fail-closed, keep the schedule enabled. If zero candidates are eligible on all legs, log it and end the pass quietly.
3b. Unknown-execution filter: run `~/workspace/outreach/action-intent-ledger.py refuse --platform x --in <eligible file> --out <final file> --pass-id x-<timestamp>` per leg using the same <timestamp>. It refuses any candidate whose account has an unresolved intent from an older pass with a truthful UNKNOWN_EXECUTION reason, never silently skipping. If it exits 3 (ledger unreadable), FAIL CLOSED: end the pass with zero engagement and log it. Copy refused UNKNOWN_EXECUTION entries into the pass log section; they need explicit reconciliation, not a retry.
4. Phase B, engagement only (browser only — the Pig's headed X Chrome; no API, no headless). Run the three legs IN ORDER, each only if it has eligible candidates:
   Sequencing rule (2026-09-29, pass x-20260929-1723): never start a Phase B leg while the probe launcher is still running; wait for its exit first. A read-only probe and a write batch on the single X Chrome stall each other (the incident probe burned its full 3120s bound with zero output). The runners enforce this mechanically: write legs wait bounded on probe completion, the probe waits bounded on write-driver release. Do not overlap them in the first place.
   4a. FOLLOWS (first): intent before action — run `~/workspace/outreach/action-intent-ledger.py write-intents --platform x --in <follow actions file> --pass-id x-<timestamp>` where the follow actions file is [{"account":"@handle","action":"follow"}]. If this fails, do not start. Then run `~/workspace/pig-fb/x-follow-batch.sh <x-follow-queue-<timestamp>.txt>`: it drives the Pig's headed X Chrome at 8-15 min jittered pacing between follows, honors the one-driver lock, and halts on restriction signals (exit 3).
   4b. COMMENTS (second): write the closed action set to ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/x-comment-actions-<timestamp>.json as [{"account":"@handle","url":"https://x.com/<handle>/status/<id>","comment_file":"<local path>"}, ...], up to 3. Intent before action via the ledger write-intents (same pass-id). Then run `~/workspace/pig-fb/x-comment.sh <x-comment-actions file> <x-comment-results file>`: it ships each comment to the Pig, drives x-comment.js at 60-120s pacing, honors the one-driver lock (waits out any follow/like driver), and halts on restriction signals (exit 3).
   4c. LIKES (third): write the closed action set to ~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes/x-actions-<timestamp>.json as [{"account":"@handle","url":"https://x.com/<handle>/status/<id>","action":"like"}, ...], up to 10. Intent before action via the ledger write-intents (same pass-id). Then run `~/workspace/pig-fb/x-engage.sh <x-actions file> <x-results file>` at 60-120s pacing.
   If any leg's runner exits 3 (restriction signal), STOP ALL REMAINING LEGS immediately and surface it to Nolan. The next pass resumes at the ramped caps; caps are never halved. If the headed browser is unavailable (CDP down, window closed), SKIP Phase B entirely for this pass: log it, do not fall back to API or headless engagement.
5. Restart safety: each runner writes per-action results. After each leg, for every completed (ok=true) action call `~/workspace/outreach/engagement-guard.py record --platform x --account <handle> [--url <post url>] --action follow|comment|like`, so the durable log reflects reality immediately. Then record outcomes: `~/workspace/outreach/action-intent-ledger.py record-outcomes --platform x --pass-id x-<timestamp> --outcomes-json <leg results file>`. Outcomes close intents; a crash between intent and outcome leaves UNKNOWN_EXECUTION, which the next pass refuses until reconciled (never auto-retried).
6. Engagement rules: follows and comments first, likes supporting. Volume: up to 5 follows + 3 comments + 10 likes per pass (ramp caps, 2026-09-25; weekly ramp +1 follow / +1 comment / +5 likes from here, no ceiling, 2026-09-26). Human pacing enforced by the runners. Never exceed caps. ONE driver at a time on the X Chrome (lockfile honored by all three runners); parallelize across platforms, never within a pass.
7. Stop instantly on any action block, checkpoint, verification challenge, rate-limit warning, or any sign of reduced reach, and report it. Log the stop and surface it to Nolan. The next pass resumes at the ramped caps; caps are never halved.
8. Post-pass verification: per leg, build a report file {"actions": [...], "manifest": "<manifest path from step 3>"} from the results file and run `~/workspace/outreach/engagement-guard.py verify --platform x --report <report file>`. The manifest pins the pre-pass snapshot; without it every recorded action would read as a violation. Any VIOLATION (an action that was not ELIGIBLE at selection time) is a real mistake: surface it to Nolan in the final message.

After the pass, append a dated pass section to ~/workspace/outreach/x-engagement.md: pass number, follows (handles), comments (handles + post URLs + comment text), likes (handles + post URLs), skipped accounts and why (including guard-blocked ones), any anomalies. Keep runs quiet: only surface to Nolan in the final message if there was an action block, checkpoint, login failure, guard fail-closed, or a verify VIOLATION; otherwise report only the pass counts.
