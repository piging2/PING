#!/bin/bash
cd /home/nolan/projects/ping
echo "=== demo-owner-mode mounts ==="
grep -rn "demo-owner-mode\|DemoOwnerMode\|demo-owner-console\|DemoOwnerConsole" src --include="*.tsx" --include="*.ts" -l | grep -v "src/fyd/owner-mode/demo-owner-console" | head
echo "=== isDemoOwnerModeEnabled def ==="
grep -n "isDemoOwnerModeEnabled" -A 10 src/fyd/owner-mode/gate.ts | head -20
