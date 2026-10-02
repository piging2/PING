---
id: facebook-unfollow-batch
title: Facebook page-unfollow batch (Nolan's page follows)
enabled: true
owner: goal:facebook-page-unfollow-cleanup
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 05:00:00
timeout_secs: 34200
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
Daily Facebook page-unfollow batch for Nolan's personal profile (2026-09-14, his explicit request: unfollow every PAGE he follows, roughly 140-200 of them; followed PEOPLE are never touched). Facebook is Pig-only: all work runs through the always-on headed Chrome on Nolan's Pig workstation via ~/workspace/pig-fb/run_unfollow.sh (which drives fb-unfollow.js over CDP :9223).

Nolan's instruction (mirroring the Instagram unfollow): the batch must run at a RANDOM time each day between 5:00 AM and 12:00 PM in his current timezone. The cron fires at 5:00 AM as the anchor; this run randomizes the rest.

State and log live in ~/workspace/outreach/facebook-unfollow/: state.json (baseline, target_per_day, status, verified_not_page list) and unfollow-log.jsonl (one JSON line per action: {"date":"YYYY-MM-DD","name":"...","url":"...","ok":true/false,"note":"..."}).

Each run, in order:
0. FIRST: pick a random delay of 0 to 25,200 seconds (uniform, so the batch starts anywhere from 5:00 AM to 12:00 PM) and sleep for it in the FOREGROUND before doing anything else, using a plain blocking sleep command. Do NOT background the sleep: a backgrounded sleep dies when this run's turn ends and the batch never executes (this exact failure has already occurred twice). The job's 9.5-hour timeout covers the full delay plus the batch work. Do not start the Pig work before this delay ends.
1. Read ~/workspace/outreach/facebook-unfollow/state.json. If status is "complete": remove this schedule with cron.remove (id facebook-unfollow-batch) and stay quiet. Nothing else to do.
2. Build the job JSON at /tmp/fb-unfollow-job-<date>.json: {"mode":"unfollow","max":<state.json target_per_day, default 30>,"minDelaySec":60,"maxDelaySec":120,"excludeUrls":<state.json verified_not_page list, default []>}.
3. Run `~/workspace/pig-fb/run_unfollow.sh /tmp/fb-unfollow-job-<date>.json` and capture the result JSON. It waits as long as the batch takes. The worker re-enumerates the live following list each run, verifies each candidate is really a Page (Like/Liked button on the destination; person profiles have none), and unfollows up to max with 60-120s human pacing. It hard-stops on any warning/checkpoint text.
4. Append one line per result to unfollow-log.jsonl with today's date. Add state.json cumulative_unfollowed += result.unfollowed. Merge result.notPageUrls into state.json verified_not_page (dedupe) so future runs do not re-visit them. Record last_batch {date, attempted, unfollowed, skipped, stopped}.
5. If the result shows pageCandidates == 0 (nothing left to unfollow): set state.json status to "complete", remove this schedule with cron.remove (id facebook-unfollow-batch), and report completion to Nolan in one short message.
6. If the worker reported any warning, block, checkpoint, or login problem (result.stopped contains "warning", or ok:false with logged_in:false, or infra cdp_down): halve state.json target_per_day for the next run (minimum 10), note it in state.json, and surface it to Nolan in one short line. Never push through a warning. Infra-only failures (cdp down, scp failed) with no account warning: leave target alone, stay quiet, let the next run retry.
7. Stay quiet otherwise. Do not message Nolan with routine batch counts. This account also runs the Facebook engagement passes every 6h; an action block here would endanger those too, so caution outranks speed every run. Pacing is deliberately conservative (30/day) because the account was locked as possibly hacked on 2026-09-13/14 and only just unlocked.
