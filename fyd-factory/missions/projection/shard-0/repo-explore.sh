#!/bin/bash
cd /home/nolan/projects/ping 2>/dev/null || cd ~/projects/ping
pwd
git status --short | head -5
git rev-parse --abbrev-ref HEAD
echo --- PROJECTION-RELATED ---
find src -maxdepth 3 -type d \( -iname "*project*" -o -iname "*concierge*" -o -iname "*ask*" \) 2>/dev/null | head -30
echo --- FYD ---
find src/fyd -maxdepth 2 -type d 2>/dev/null | head -50
