# STAGED - Dedicated Threads Chrome profile (hands-on at the Pig)

Status: STAGED, not active. The remote fix (worker-owned separate windows inside
the shared ig-profile, live 2026-09-23) already resolves the tab sprawl Nolan
reported. This package is the DURABLE full-isolation option: Threads gets its
own Chrome process, profile, and CDP port, completely independent of the
Instagram worker browser.

Why it is staged, not done remotely: a fresh Chrome profile has no login.
Threads web auth IS Instagram auth, so the new profile needs Nolan to log into
Instagram/Threads once, in person, in the new window. Nothing remote can do
that step without his credentials (which we never handle).

## What Nolan does at the Pig (about 5 minutes)

1. Open PowerShell and run:
   ```
   & 'C:\Program Files\Google\Chrome\Application\chrome.exe' --user-data-dir=C:\Users\nolan\.local\share\pigi\threads-profile --remote-debugging-port=9228 --start-maximized https://www.threads.com/
   ```
   A NEW Chrome window opens (separate from every existing window).
2. In THAT new window only: log into Threads (it will route through Instagram
   login; use the @nolanpigi Instagram account). Confirm the Threads feed loads
   logged in.
3. Leave that window open. Done on his side.

## What Pigi does after Nolan confirms login (remote, no Pig visit needed)

1. Copy `chrome-cdp-watchdog-threads.ps1.staged` to
   `C:\Users\nolan\.local\share\pigi\chrome-cdp-watchdog-threads.ps1`
   (remove the .staged suffix) via scp.
2. Register the `PigiThreadsLogin` scheduled task on the Pig (mirrors
   PigiIGLogin): runs at Nolan logon and every 5 minutes, launches the watchdog
   via hidden-launch.vbs. Never touches the ig-profile or fb-profile processes:
   the watchdog only stops chrome.exe processes whose command line references
   the threads-profile dir.
3. Copy `ensure-cdp-threads.sh.staged` to `~/workspace/pig-fb/ensure-cdp-threads.sh`
   (remove suffix).
4. Update `run_th_pass.sh`: preflight `ensure-cdp-threads.sh` (:9228) instead of
   `ensure-cdp-ig.sh`; th-engage.js CDP constant `http://localhost:9226` -> `9228`.
5. Add 9228 to `cdp-health.sh` default ports and PROFILE map; bump
   `pig-capabilities.json` (new threads-profile browser entry).
6. Run one 0-action dry run of th-engage.js against :9228 to prove the window,
   login, and cleanup; then re-enable heavy Threads passes.

## Rollback

If anything misbehaves: revert `run_th_pass.sh` to `ensure-cdp-ig.sh` and the
th-engage.js CDP port to 9226. The shared-profile worker-window fix keeps
working unchanged. The threads-profile window can simply be closed.

## Files in this directory

- `CHECKLIST.md` (this file)
- `chrome-cdp-watchdog-threads.ps1.staged`
- `ensure-cdp-threads.sh.staged`
