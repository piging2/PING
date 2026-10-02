#!/bin/bash
cd /home/nolan/projects/ping
echo "===== one media object example ====="
grep -rn '"schema": "ping.social.media@1"' src/fyd --include='*.ts' | head -3
