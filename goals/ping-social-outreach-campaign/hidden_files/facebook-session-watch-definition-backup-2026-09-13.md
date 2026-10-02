---
id: facebook-session-watch
title: Facebook session watch
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-10T14:01:29
  every: 2h
timeout_secs: 600
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Facebook session watchdog for PING Social outreach. Nolan's standing rule (2026-09-10): whenever the Facebook browser session is logged out, automatically start the re-login flow without waiting for him to ask. He approves it on his iPhone by opening the browser.

Each run, in order:
1. Check browser.list_tasks first. If a Facebook login task is already running or waiting on the user, do nothing further and end quietly. Never stack duplicate login attempts.
2. Otherwise run one quick browser task: open https://www.facebook.com and report only whether it loads signed in as Nolan Geske or shows a public login form. Login-state check only. No likes, comments, messages, posts, follows, or any other actions.
3. If signed in: end the run with no user-facing message.
4. If logged out: spawn the Facebook re-login task with this brief: log back into Facebook for Nolan Geske using the browser's saved login or passkey restore; check any "Remember me" / "Keep me logged in" option on the form; never ask for or invent passwords; if a passkey or device approval prompt must be approved on his iPhone, hand back asking for that approval and wait. Login only, no other actions.
5. After spawning the re-login: if it is between 22:00 and 07:00 America/Denver, end with no user-facing message (the login waits for his morning approval). Otherwise the final message is one short line: Facebook logged out again, re-login started, approve the prompt on the iPhone.
