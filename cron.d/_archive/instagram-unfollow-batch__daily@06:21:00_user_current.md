---
id: instagram-unfollow-batch
title: Instagram unfollow batch (nolanpigi cleanup)
enabled: true
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 06:21:00
timeout_secs: 9000
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
Daily Instagram unfollow batch for Nolan's own account @nolanpigi (2026-09-14, his explicit request: unfollow literally everyone he follows, about 3,706 accounts at start, target ~80/day to finish in roughly a month and a half). Instagram has no CLI unfollow, so each batch goes through a live browser task on the logged-in cloud Instagram session.

State and log live in ~/workspace/outreach/instagram-unfollow/: state.json (baseline, target_per_day, status) and unfollow-log.jsonl (one JSON line per unfollowed account: {"date":"YYYY-MM-DD","username":"@handle","ok":true}).

Each run, in order:
1. Read ~/workspace/outreach/instagram-unfollow/state.json. Get the current following count: `instagram-cli profile --account-id 17841400771094478` and read profiles[0].following_count.
2. If following_count is 0: the job is done. Update state.json status to "complete", remove this schedule with cron.remove (id instagram-unfollow-batch), and report completion to Nolan. Nothing else to do.
3. Otherwise spawn a browser task (browser.spawn_task) with this self-contained brief: Instagram unfollow batch for the account owner's own account @nolanpigi, already logged in. Go to https://www.instagram.com/nolanpigi/following/. Starting from the top of the Following list, for each row click the 'Following' button then 'Unfollow' in the confirmation dialog. Wait 45 to 75 seconds between unfollows, varying the delay. Scroll naturally to load more rows. Record every @username unfollowed. Stop after N successful unfollows, where N is state.json target_per_day (default 80). Hard stop immediately on any 'Action Blocked', 'Try Again Later', 'We restrict certain activity', checkpoint, verification challenge, suspicious-login screen, login page, or anything resembling a rate-limit warning; report the exact text seen and the count completed. Unfollows only: no likes, comments, follows, DMs, or posts. Only rows in the Following list, never 'Suggested for you'.
4. When the browser task reports back, append one line per unfollowed username to unfollow-log.jsonl with today's date. Re-check following_count via the CLI; it should have dropped by about the completed count.
5. If the browser task reported any warning, block, checkpoint, or login problem: halve state.json target_per_day for the next run (minimum 20), note it in state.json, and surface it to Nolan in one short line. Never push through a warning.
6. Stay quiet otherwise. Do not message Nolan with routine batch counts. This account also runs the Instagram engagement passes; an action block here would stop those too, so caution outranks speed every run.
