#!/bin/bash
cd /home/nolan/projects/ping
echo "=== dump.py head ==="
head -100 /home/nolan/ping/tools/fyd-site-projection/dump.py
echo ""
echo "=== PING var layout ==="
ls /home/nolan/ping/var/ 2>&1
echo ""
echo "=== search for observation stores / ingestion records ==="
find /home/nolan/ping -maxdepth 3 -type d 2>/dev/null | head -40
