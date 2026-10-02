#!/bin/bash
# W-PROOF STEP 4 wrapper: start Windows Chrome headless with a TCP CDP port,
# run the Playwright CDP capture script, then kill Chrome.
# Single ssh session holds everything alive; no detached daemons.
set -u
PROF="/mnt/c/Temp/fyd-proof-profile"
mkdir -p "$PROF"
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --no-first-run --no-default-browser-check --disable-gpu \
  --remote-debugging-port=9222 --user-data-dir="$PROF" about:blank &
CHROME_PID=$!
sleep 4
cd /home/nolan/projects/ping
npx tsx /home/nolan/fyd-proof-run/wproof-step4.ts
RC=$?
kill "$CHROME_PID" 2>/dev/null
exit "$RC"
