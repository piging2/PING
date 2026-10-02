#!/bin/bash
echo "MARKER node-where start"
cmd.exe /c "where node" 2>&1 | head -5
echo "MARKER node-where end"
echo "MARKER chromium check"
ls /mnt/c/Users/nolan/.local/share/pigi/ 2>/dev/null | head
echo "MARKER done"
