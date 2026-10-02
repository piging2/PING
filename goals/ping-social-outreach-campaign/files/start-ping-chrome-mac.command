#!/bin/bash
# PING Social dedicated Chrome starter (Mac)
# Double-click this file, then log into Facebook and Instagram once
# in the Chrome window it opens. Leave that Chrome window running
# and the laptop awake and plugged in.

PROFILE="$HOME/PINGSocialChrome"
mkdir -p "$PROFILE"

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0 \
  --remote-allow-origins=* \
  --user-data-dir="$PROFILE" >/dev/null 2>&1 &

echo "Chrome is starting on the PING Social profile."
echo "Log into Facebook and Instagram once in that window, then leave it open."
