#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== src/types/media.ts lines 34-200 ====="
sed -n '34,200p' src/types/media.ts
