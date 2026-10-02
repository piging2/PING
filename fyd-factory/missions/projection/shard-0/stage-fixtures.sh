#!/bin/bash
ls /mnt/c/Users/nolan/fyd-fixtures-p0 2>/dev/null | head -5
if [ -d /mnt/c/Users/nolan/fyd-fixtures-p0 ]; then
  mkdir -p /home/nolan/fyd-fixtures-p0
  cp -r /mnt/c/Users/nolan/fyd-fixtures-p0/. /home/nolan/fyd-fixtures-p0/
  find /home/nolan/fyd-fixtures-p0 -name "*.json" | wc -l
fi
rm -f /mnt/c/Users/nolan/transfer/harness.ts
