# Meta AI Research Throughput: Baseline, Probes, Safe Ceiling
Date: 2026-09-13. Probe operator: Pigi subagent, per Nolan's direct order to maximize Meta AI research throughput without getting flagged. Account safety outranks throughput throughout.

## 1. Measured baseline (from runs.jsonl + live probes, 2026-09-13)

Cron: `meta-ai-intel-pass`, goal-owned, interval 6h, 1 prompt per pass, 4-prompt rotation a->b->c->d->a, advances on ok only. Next slug derived from ledger, not rotation.txt.

Successful research pass (run 20260913-191216-a-weak-website-hunt, the only ok research capture of the day):
- Start 19:12:16Z, complete 19:18:29Z: 373 seconds end to end (about 6.2 min).
- Answer: 18608 chars, 32 numbered businesses, validation passed, exit 0.
- All other runs today ended capture_failed, infra, or terminated_by_signal_TERM. None showed Meta-side throttling; failures were our side (encoding, prompt ordering, scheduler SIGTERM, locator miss).

Session health (live probe 2026-09-13 ~16:16 MDT via meta-check.js): meta.ai loads, chat input present, no login buttons, no challenge. Login stable. Chat history sidebar shows all prior research tabs. No flag, CAPTCHA, "try again later", or rate-limit text observed in any run today.

Effective current throughput: 1 prompt per 6h = 4 prompts/day, each yielding roughly 12-32 researched items when the capture succeeds.

Pig-side watch: chrome-cdp-watchdog.log shows CDP (FB-profile Chrome) went down twice today (10:03, 13:49) and auto-recovered both times. No Meta AI session loss tied to those events.

## 2. Probe design (conservative, sequential, small steps)

Each probe is a real research pass via the standard meta-pass.sh path (job envelope + versioned pack + CDP ask + byte-exact pull + validation), so probes produce genuine intelligence, not junk traffic.

- Probe 1: single new prompt e-seasonal-demand-calendar (genuine need: seasonal demand calendar, the strongest PING-promotion candidate from the learning triage).
- Probe 2: second new prompt f-trade-network-scan run back-to-back immediately after Probe 1 completes, testing 2-prompts-per-pass intensity with near-zero interval.
- Probe 3 (only if 1-2 clean): a third prompt back-to-back to test 3-per-pass.

Watch signals per probe: total latency, answer chars, numbered items vs the 6.2-min/32-item baseline, plus any "try again later", slowdowns, quality drops, or session challenges. Stop rule: first sign of throttling ends the escalation and we back off to the last clean level.

## 3. Probe results

(TO BE FILLED as probes complete.)

## 4. Safe ceiling and recommendation

(TO BE FILLED.)

## 5. Changes applied

(TO BE FILLED. Only changes proven safe by the probes. Anything needing Nolan goes in section 6.)

## 6. Items needing Nolan

(TO BE FILLED.)

## 7. Monitoring to add

(TO BE FILLED.)

## Throughput probes, 2026-09-13 evening (MDT)

### Local delivery root cause, found and fixed
After the 19:12 UTC success, every run failed at prompt delivery (not at Meta AI):
meta.ai's composer had changed. A visible "Conversation title" INPUT now sits
before the real composer, so getByRole('textbox').first() typed into the wrong
field; the composer also re-renders mid-typing, which both lost keystrokes and
corrupted innerText measurement (fake stalls, duplicate retypes, mystery wipes
where ~3400 delivered chars vanished between chunks). insertText chunks were
unreliable on this re-rendering composer.

Fix (all in ~/workspace/pig-fb/meta-ask.js, syntax-checked, proven live):
- Locator ladder now tries div[contenteditable="true"] FIRST
  (composer-contenteditable), before generic textbox lookup.
- Delivery switched from per-keystroke chunk typing to clipboard paste:
  grant clipboard perms on the CDP context, navigator.clipboard.writeText,
  click composer, Ctrl+V. Paste delivers the full prompt atomically as one
  input event. Verified: 5054/5054 chars delivered on the live run.
- Delivery measurement reads the hidden textarea[placeholder="Ask Meta AI..."]
  backing value (syncs reliably), falling back to composer innerText.
- Failing worker telemetry preserved: DELIVERED / TYPE-STALL / NOT-DELIVERED /
  PASTE-FAILED / INFRA lines feed runs.jsonl classification.

### Probe results (sequential, back-to-back, near-zero interval)
- Probe 1, e-seasonal-demand-calendar, 22:50:58Z -> 22:52:49Z (111s): ok,
  DELIVERED 5054/5054 chars, answer 11477 chars, 5 numbered items, validation
  passed, exit 0. No throttle/challenge/CAPTCHA/login signals.
- Probe 2, f-trade-network-scan, 22:53:34Z -> 22:55:24Z (110s): ok, DELIVERED
  4773/4773 chars, answer 11900 chars, 20 numbered items, validation passed,
  exit 0. Run immediately after Probe 1. No throttle signals.
- Probe 3, c-review-complaint-signals, 22:56:03Z -> ~22:57:55Z (~112s): ok,
  DELIVERED 5172/5172 chars, answer 9254 chars, 5 numbered items, validation
  passed, exit 0. Run immediately after Probe 2. No throttle signals.

Zero Meta-side degradation across all three: consistent ~110s end-to-end
timings, answers streamed normally, session healthy throughout. Earlier probe
failures (221647/221908/223140/223411/224546 runs) were all local: wrong-field
typing, fake stalls, SIGTERM from tool-service restarts, incomplete prompt
delivery. None were Meta rate limiting.

### Proven safe ceiling
Three sequential research prompts, back-to-back, each ~110s end to end:
no throttling, no challenge, no quality collapse. Paste delivery made runs
~3x faster than the 373s per-keystroke baseline.

### Production change applied
meta-ai-intel-pass cron: still every 6h (cadence unchanged), now runs TWO
prompts per pass (new step 2b). Second prompt runs only if the first ends ok;
never a third in one pass; rotation advances on ok only as before. Daily
throughput goes from 4 to 8 research prompts. Next run Sun 2026-09-13
21:04 MDT. Conservative: probes proved 3 safe; production uses 2 for headroom.
Revisit only after several clean 2-per-pass days.

### Monitoring status
Per-run latency is already in runs.jsonl (started_at/completed_at) and the
validator already records answer chars + numbered items; worker stdout lines
(DELIVERED/LOCATOR/INFRA) feed classification. Still missing: an automated
throttle-phrase scan of each pulled answer. Recommended scan (to be added to
meta-pass.sh when approved): case-insensitive grep of the raw answer bytes
for "try again later", "slow down", "rate limit", "captcha",
"verify you are human", "unusual activity", "temporarily unavailable";
on match, set RUN_CLASS=throttle_signal and fail the run closed for human
review. APPLIED 2026-09-13 ~17:05 MDT as step 4a in meta-pass.sh
(syntax-checked with bash -n; evidence preserved, never enters extraction).
No verification-gate or PING-emission code was touched at any point.
