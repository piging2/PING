#!/bin/bash
set -u
# Cleanup: remove C: transfer bridge copies and the Pig scratch dir.
rm -f /mnt/c/Users/nolan/transfer/td001-repro.test.ts \
      /mnt/c/Users/nolan/transfer/td001-repro-live.test.ts \
      /mnt/c/Users/nolan/transfer/td001-newtest.test.ts \
      /mnt/c/Users/nolan/transfer/td001-final.test.ts
rm -rf /home/nolan/.fyd-td001
ls /mnt/c/Users/nolan/transfer/ 2>/dev/null | grep -c td001 || echo "transfer clean"
cd /home/nolan/projects/ping && git status -sb | head -6
