#!/bin/bash
cd /home/nolan/projects/ping
echo "===== validator exports ====="; grep -n "export function\|severity" src/fyd/sitespec/validator.ts | head -30
echo; echo "===== middleware ====="; cat src/middleware.ts
