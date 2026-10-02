#!/bin/bash
cd /home/nolan/projects/ping
grep -n "boundField\|boundTitle\|boundDescription" src/fyd/components/renderer.tsx | head -40
echo; echo "===== owner_authored / derived call sites ====="; grep -n "owner_authored\|\"derived\"" src/fyd/components/renderer.tsx | head -20
