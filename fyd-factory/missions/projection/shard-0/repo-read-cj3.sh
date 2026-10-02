#!/bin/bash
cd /home/nolan/projects/ping
grep -n "target\.\|obj\.\|object\." src/fyd/ask/concierge.ts | grep -v "^\s*\*" | head -60
echo "########## PingObject shape ##########"
sed -n '83,230p' src/lib/ping/types.ts
