---
id: copilot-auth-retry-20260917
title: Copilot identity_1 authorization retry
enabled: true
owner: goal:copilot-identity-broker
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-17T16:37:00
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"96fe733e-ce49-4745-b2b9-63bbab812c2b"}'
  presentation_locale: en-US
---
Retry the Copilot identity_1 authorization on the Pig (Nolan asked to try again ~15 min after 16:21 MDT; he should be home at the Pig by the time this fires).

DO THIS:
1. On the Pig WSL, launch `bash ~/copilot-broker/scripts/authorize.sh identity_1` in the FOREGROUND of one persistent SSH session. Use a single backgrounded exec whose ssh process stays alive for the whole run (e.g. muse.exec background:true running `ssh -F ~/.ssh/pig-config pigwsl "wsl bash ~/copilot-broker/scripts/authorize.sh identity_1"` with output teed to /tmp/authz-id1-retry.log). CRITICAL: do NOT launch it detached via setsid/nohup after closing the SSH session. That breaks powershell.exe WSL interop (UtilAcceptVsock accept4 failed 110) and the script fails before the browser opens. This was proven earlier today.
2. Wait ~60 seconds, then read /tmp/authz-id1-retry.log and confirm it shows "A FRESH Chrome window just opened on the Pig".
3. Report back: whether the fresh Chrome window opened, and if so, the main agent must immediately tell Nolan to sign in to GitHub in that fresh window and click Authorize (5-minute window).

KNOWN BLOCKER (do not try to work around it): after Nolan clicks Authorize, the CLI prints "Login succeeded, but the token was not saved" because WSL has no keychain and the script feeds /dev/null, auto-declining plaintext storage. Nolan has NOT yet approved the stdin-acceptance fix. If the run reaches that point, report it as the expected known blocker and stop. Do not modify authorize.sh, do not install anything, do not create tokens.
