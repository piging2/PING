# X headed-browser setup on the Pig (2026-09-13 ~17:25 MDT)

Dedicated headed Chrome for X read-only intelligence, mirroring the FB/LI pattern.
Nolan's directive: "START THE HEADED BROWSER HOW YOU DID WITH FACEBOOK."

## Created on the Pig (C:/Users/nolan/.local/share/pigi/)
- `x-profile/` — dedicated Chrome profile (NEW, never touches personal Chrome, fb-profile, li-profile)
- `chrome-cdp-watchdog-x.ps1` — watchdog: probes CDP :9225; if down, kills ONLY chrome
  processes whose command line contains the x-profile path, then relaunches headed/maximized
  at https://x.com/login
- `chrome-cdp-watchdog-x.log` — watchdog log
- `PigiXLogin.xml` / `install-PigiXLogin.ps1` — task definition + installer (local copies too)
- `x-tools/check_login.js` — CDP login check (positive signal: aria-label="Home timeline")
- `x-tools/run_check.ps1` — runner (sets NODE_PATH to fb-engage node_modules for playwright-core)
- `x-tools/diag.js`, `x-tools/list_chrome.ps1` — diagnostics

## Scheduled task
- `PigiXLogin` — runs as nolan (InteractiveToken), at nolan logon AND every 5 min indefinitely.
  State: Ready. Verified ticking: last run 17:25, next 17:30, LastTaskResult 0.
  (New task, so no backup was needed; nothing existing was modified.)

## Local tooling copies (~/workspace/pig-fb/)
chrome-cdp-watchdog-x.ps1, PigiXLogin.xml, install-PigiXLogin.ps1, x-check-login.js,
x-check-login-run.ps1, x-diag.js, x-list-chrome.ps1

## Verification (all live)
- CDP :9225 → HTTP 200. FB :9223 → 200, LI :9224 → 200 (undisturbed).
- Watchdog kill-scope check: 11 chrome PIDs matched `x-profile`; 32 others
  (fb-profile, li-profile, Nolan's personal Chrome) do NOT match and are never touched.
- Watchdog log: "CDP down; no x-profile chrome process running" → "relaunch OK; CDP :9225 up".
- Login check: **LOGIN ok — profile is already signed in as Nolan Geske @GeskeNolan**
  (home timeline rendered, real posts). Nolan signed into the maximized window himself
  between launch and the check. No sign-in needed from him now.

## Key facts for the parent
- Nolan's X handle: **@GeskeNolan** (discovered from the logged-in profile).
- Zero interactions performed: no follows, likes, comments, DMs. Read-only checks only.
- Nolan needs to do NOTHING for the browser — it's logged in and watched.
- Read-only X intelligence sweep can now run through this browser at zero API cost.
- Writes (follows/likes) still require the official X API and remain paused until Nolan authorizes.
