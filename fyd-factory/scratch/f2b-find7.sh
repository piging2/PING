#!/bin/bash
cd /home/nolan/projects/ping
echo "=== batch mentions anywhere ==="
grep -rli "batch-a\|batch_a\|batch b" src research scratch README.md 2>/dev/null | head
echo "=== corpus manifest dir listing ==="
ls ~/workspace 2>/dev/null; echo "--- pig workspace corpus:"
find /home/nolan/workspace -maxdepth 4 -iname "*corpus*" 2>/dev/null | head
echo "=== factory spec docs ==="
find . -path ./node_modules -prune -o -iname "*.md" -print 2>/dev/null | grep -iE "factory|corpus|fixture" | head
