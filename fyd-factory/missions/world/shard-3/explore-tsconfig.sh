#!/bin/bash
cd /home/nolan/projects/ping
echo "=== repo tsconfig ==="; cat tsconfig.json 2>/dev/null | head -40
echo "=== package.json type ==="; grep -m1 '"type"' package.json
