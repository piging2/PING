---
id: instagram-unfollow-batch
title: Instagram unfollow batch (nolanpigi cleanup)
enabled: true
owner: goal:instagram-mass-unfollow
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-29T11:30:38
  every: 6h
timeout_secs: 34200
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Instagram unfollow batch for Nolan's own account @nolanpigi (2026-09-14, his explicit request: unfollow literally everyone he follows; about 3,291 remaining as of 2026-09-25). Instagram has no CLI unfollow, so each batch runs ON THE PIG through the always-on headed Chrome (ig-profile, CDP :9226) via ~/workspace/pig-fb/run_ig_unfollow.sh. Nolan's directive (2026-09-16): Pig-first, almost always.

STANDING ORDER (Nolan, 2026-09-29 ~05:30 MDT): batches run BACK-TO-BACK automatically on this 6-hour cadence with no reminder needed from him. Catch up the missed days (2026-09-26 through 2026-09-29) with the higher rate, then keep ramping volume up over time. The no-flag constraint is absolute: any warning, block, checkpoint, or login problem hard-stops the batch and the rate halves. Never trade account safety for speed.

State and log live in ~/workspace/outreach/instagram-unfollow/: state.json (baseline, target_per_batch, daily_cap, clean_streak_days, last_ramp_date, status) and unfollow-log.jsonl (one JSON line per unfollowed account: {"date":"YYYY-MM-DD","username":"@handle","ok":true}).

Each run, in order:
1. Read state.json. Count today's completed unfollows: count lines in unfollow-log.jsonl whose "date" is today in America/Denver. If today's count >= state.json daily_cap (default 300): append the skip to the daily log, stay quiet, do nothing else. This is the daily ceiling that keeps the ramp from tripping flags.
2. Get the current following count: `instagram-cli profile --account-id 17841400771094478` and read profiles[0].following_count.
2a. Capability gate (automation-resilience program, 2026-09-17): run_ig_unfollow.sh checks ~/workspace/pig-fb/ig-capability-state.json FIRST, before any CDP probe or browser work. If it records status=BLOCKED, the script exits 2 with classification DEPENDENCY_FAILURE and performs zero actions: log the blocked run, keep this schedule enabled, do NOT halve the rate (infra failure, not an account warning), and stay quiet. Never fire browser work into a wedged browser; never attempt to restart, kill, or relaunch the ig-profile Chrome (the 2026-09-16 force-kill lost the IG session). Recovery is Nolan's manual close/reopen, verified by ~/workspace/pig-fb/ig-recovery-test.sh.
2b. Canary (2026-09-17): when the capability state carries canary_required=true (set automatically by ig-recovery-test.sh when a wedge clears), the runner exports CANARY_REQUIRED=1 to the Pig worker: the worker unfollows exactly ONE account as a canary, verifies the button flip, and only then continues the batch; a failed canary halts the run. The flag clears automatically after a verified canary. No manual step.
3. If following_count is 0: the job is done. Update state.json status to "complete", remove this schedule with cron.remove (id instagram-unfollow-batch), and report completion to Nolan. Nothing else to do.
4. Otherwise run the Pig unfollow worker: write a job JSON to /tmp/ig-unfollow-<runid>.json with {"mode":"unfollow","max":N,"minDelaySec":45,"maxDelaySec":75} where N = min(state.json target_per_batch, daily_cap - today's count), then execute `~/workspace/pig-fb/run_ig_unfollow.sh /tmp/ig-unfollow-<runid>.json`. The worker attaches to the Pig's ig-profile Chrome, enumerates the Following list, unfollows up to N accounts at 45-75s pacing, verifies each unfollow by the button flip, and hard-stops on any warning, block, checkpoint, or login problem. It never touches "Suggested for you" rows. If the worker reports a logged_out session (IG session dropped in the Pig browser) or CDP unavailable: do zero unfollows, halve target_per_batch and daily_cap (minimums 20 and 60), and surface one short line to Nolan that he must log into Instagram again in the Pig's ig-profile Chrome window. Never attempt a login yourself.
5. When the worker reports back, append one line per unfollowed username (from the result's unfollowedUsernames array) to unfollow-log.jsonl with today's date. Re-check following_count via the CLI; it should have dropped by about the completed count. Update state.json current_following_estimate and last_batch.
6. If the worker reported any warning, block, checkpoint, or login problem: halve state.json target_per_batch (minimum 20) and daily_cap (minimum 60), reset clean_streak_days to 0, note it in state.json, and surface it to Nolan in one short line. Never push through a warning.
7. Ramp (only on a fully clean batch with zero warnings): increment clean_streak_days in state.json. If clean_streak_days >= 7 and (last_ramp_date is empty or at least 7 days ago): target_per_batch = min(target_per_batch + 25, 150), daily_cap = min(daily_cap + 100, 500), set last_ramp_date to today, note the new rate in state.json. This is the standing "keep ramping up" mechanism; it only climbs while every batch stays clean.
8. Stay quiet otherwise. Do not message Nolan with routine batch counts. This account also runs the Instagram engagement passes on the same Pig browser; an action block here would stop those too, so the no-flag constraint outranks speed every run.
