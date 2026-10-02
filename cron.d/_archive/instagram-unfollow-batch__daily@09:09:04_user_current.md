---
id: instagram-unfollow-batch
title: Instagram unfollow batch (nolanpigi cleanup)
enabled: true
owner: goal:instagram-mass-unfollow
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 09:09:04
timeout_secs: 34200
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false}'
  presentation_locale: en-US
---
Daily Instagram unfollow batch for Nolan's own account @nolanpigi (2026-09-14, his explicit request: unfollow literally everyone he follows, about 3,706 accounts at start, target ~80/day to finish in roughly a month and a half). Instagram has no CLI unfollow, so each batch runs ON THE PIG through the always-on headed Chrome (ig-profile, CDP :9226) via ~/workspace/pig-fb/run_ig_unfollow.sh. Nolan's directive (2026-09-16): Pig-first, almost always.

Nolan's instruction (2026-09-14): the batch must run at a RANDOM time each day between 5:00 AM and 12:00 PM in his current timezone. RANDOMIZATION MECHANISM (2026-09-19 fix): the old design slept in-run for the random delay, but the runtime backgrounds any in-run sleep past about 2 minutes and the sleep dies when the turn ends, which killed 4 of the last 5 runs. Do NOT sleep for the delay. Instead the job randomizes its own daily fire time: the final step of every run picks tomorrow's random time via cron.update (step 7). The batch itself always runs immediately when the job fires.

State and log live in ~/workspace/outreach/instagram-unfollow/: state.json (baseline, target_per_day, status) and unfollow-log.jsonl (one JSON line per unfollowed account: {"date":"YYYY-MM-DD","username":"@handle","ok":true}).

Each run, in order:
1. Read ~/workspace/outreach/instagram-unfollow/state.json. Get the current following count: `instagram-cli profile --account-id 17841400771094478` and read profiles[0].following_count.
1a. Capability gate (automation-resilience program, 2026-09-17): run_ig_unfollow.sh checks ~/workspace/pig-fb/ig-capability-state.json FIRST, before any CDP probe or browser work. If it records status=BLOCKED (currently BROWSER_WEDGE on the Pig's ig-profile Chrome), the script exits 2 with classification DEPENDENCY_FAILURE and performs zero actions: log the blocked run, keep this schedule enabled, do NOT halve target_per_day (infra failure, not an account warning), and stay quiet. Never fire browser work into a wedged browser; never attempt to restart, kill, or relaunch the ig-profile Chrome yourself (the 2026-09-16 force-kill lost the IG session). Recovery is Nolan's manual close/reopen, verified by ~/workspace/pig-fb/ig-recovery-test.sh.
1b. Canary (2026-09-17): when the capability state carries canary_required=true (set automatically by ig-recovery-test.sh when the wedge clears), the runner exports CANARY_REQUIRED=1 to the Pig worker: the worker unfollows exactly ONE account as a canary, verifies the button flip, and only then continues the batch; a failed canary halts the run. The flag clears automatically after a verified canary. No manual step.
2. If following_count is 0: the job is done. Update state.json status to "complete", remove this schedule with cron.remove (id instagram-unfollow-batch), and report completion to Nolan. Nothing else to do.
3. Otherwise run the Pig unfollow worker: write a job JSON to /tmp/ig-unfollow-<runid>.json with {"mode":"unfollow","max":N,"minDelaySec":45,"maxDelaySec":75} where N is state.json target_per_day (default 80), then execute `~/workspace/pig-fb/run_ig_unfollow.sh /tmp/ig-unfollow-<runid>.json`. The worker attaches to the Pig's ig-profile Chrome, enumerates the Following list, unfollows up to N accounts at 45-75s pacing, verifies each unfollow by the button flip, and hard-stops on any warning, block, checkpoint, or login problem. It never touches "Suggested for you" rows. If the worker reports logged_out:false session (IG session dropped in the Pig browser) or CDP unavailable: do zero unfollows, halve target_per_day (minimum 20), and surface one short line to Nolan that he must log into Instagram again in the Pig's ig-profile Chrome window. Never attempt a login yourself.
4. When the worker reports back, append one line per unfollowed username (from the result's unfollowedUsernames array) to unfollow-log.jsonl with today's date. Re-check following_count via the CLI; it should have dropped by about the completed count.
5. If the worker reported any warning, block, checkpoint, or login problem: halve state.json target_per_day for the next run (minimum 20), note it in state.json, and surface it to Nolan in one short line. Never push through a warning.
6. Stay quiet otherwise. Do not message Nolan with routine batch counts. This account also runs the Instagram engagement passes on the same Pig browser; an action block here would stop those too, so caution outranks speed every run.
7. FINAL STEP, every run (success, gated, or failed, as long as the turn is still alive): pick a uniform random clock time between 05:00:00 and 12:00:00 in the job's timezone (@user.current) for TOMORROW, then call cron.update with id instagram-unfollow-batch and schedule {"kind":"daily","time":"<HH:MM:SS>"}, changing nothing else. Verify the update reports the new time. This is what keeps the batch at a random morning time each day; never sleep to achieve the delay. If this step fails, log it and move on: the previously set time stands and the job still fires daily.
