#!/bin/bash
ls /mnt/c/Users/nolan/transfer/ 2>/dev/null
echo "--- repo test dir ---"
ls /home/nolan/projects/ping/src/fyd/ask/__tests__/ | grep -i night || echo "no night test files in repo"
echo "--- git status count ---"
cd /home/nolan/projects/ping && git status --porcelain | wc -l
