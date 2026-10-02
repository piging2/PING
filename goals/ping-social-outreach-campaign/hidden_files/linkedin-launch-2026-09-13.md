# LinkedIn Chrome Launch Log — 2026-09-13

Nolan approved the LinkedIn automation plan ("go ahead, open the browser, I'll sign in").
This log records the one-time launch of the LinkedIn headed Chrome on the Pig.

## What was done

1. Reviewed staged artifacts in ~/workspace/pig-linkedin/:
   engage.js, check_login.js, run_pass.sh, ensure-cdp-li.sh,
   chrome-cdp-watchdog-li.ps1. All passed node --check / bash -n.
2. Copied chrome-cdp-watchdog-li.ps1 to
   C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog-li.ps1 (new file).
3. Created scheduled task PigiLILogin (new; nothing modified, so no backup
   was needed). Mirrors PigiFBLogin exactly: runs as the nolan principal
   (InteractiveToken), fires at nolan logon and repeats every 5 minutes,
   executes the li watchdog. Verified: schtasks reports Ready, Interactive only.
4. Fired PigiLILogin on demand (schtasks /run) so the window opens now
   instead of waiting for the next 5-minute tick.
5. Verified launch:
   - Watchdog log: "2026-09-13 16:21:04 CDP down; no li-profile chrome
     process running" then "2026-09-13 16:21:14 relaunch OK; CDP :9224 up".
   - CDP http://127.0.0.1:9224/json/version returns 200
     (Chrome/153.0.8010.36).
   - 11 chrome.exe processes carry li-profile in the command line, all in
     session 1 (nolan, console, Active) — the window is on his visible desktop.
   - Facebook instance untouched: :9223 still returns 200.
   - Nolan's personal Chrome untouched: no chrome process was stopped;
     the watchdog only launched, never killed, since no li-profile
     processes existed.
6. Ran check_login.js on the Pig via CDP :9224. Result: LOGIN logged_out
   (exit 0). Expected: Nolan has not signed in yet.
7. Cleaned up temp probe scripts from C:/Windows/Temp.

## Current state

- LinkedIn Chrome window is OPEN on the Pig's console desktop, started
  maximized, pointed at https://www.linkedin.com/login, CDP :9224 live.
- PigiLILogin keeps it alive (logon + every 5 min). The watchdog kills ONLY
  chrome processes whose command line references the li-profile directory;
  it can never touch the fb-profile instance or Nolan's personal Chrome.
- Session state: logged out, awaiting Nolan's sign-in.
- ZERO interactions sent. No engagement cron created. No automated passes
  will run until Nolan confirms sign-in and explicitly starts the warmup.

## Instruction for Nolan

On the Pig, look for the Chrome window showing the LinkedIn login page.
Sign in there yourself (complete 2FA if enabled). That is the only step
no one else can do. Once signed in, tell me and I will verify the session,
then we start the week-1 warmup (likes only, max 10/day) only on your word.

## Files

- Watchdog: C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog-li.ps1
- Task XML: C:/Users/nolan/.local/share/pigi/PigiLILogin.xml
- Watchdog log: C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog-li.log
- Plan: ../linkedin-automation-plan-2026-09-13.md
