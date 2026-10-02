#!/bin/bash
cd /home/nolan/projects/ping
echo "===== resolveQuery ====="; grep -n "export function resolveQuery" -A 30 src/fyd/components/renderer.tsx | head -45
echo; echo "===== identity session head ====="; head -40 src/fyd/identity/session.ts
echo; echo "===== claim store head ====="; head -40 src/fyd/claim/store.ts
