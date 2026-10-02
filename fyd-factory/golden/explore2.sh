#!/bin/bash
echo "=== happy-place-platform ==="
ls /home/nolan/projects/happy-place-platform/ 2>/dev/null | head -30
echo "--- git? ---"
git -C /home/nolan/projects/happy-place-platform rev-parse --show-toplevel 2>&1 | head -2
git -C /home/nolan/projects/happy-place-platform branch --show-current 2>&1
git -C /home/nolan/projects/happy-place-platform rev-parse HEAD 2>&1
git -C /home/nolan/projects/happy-place-platform remote -v 2>&1 | head -5
git -C /home/nolan/projects/happy-place-platform log --oneline -8 2>&1 | head -10
echo "=== happy-place-platform-forensic ==="
ls /home/nolan/projects/happy-place-platform-forensic/ 2>/dev/null | head -30
echo "=== package.json names ==="
grep -m1 '"name"' /home/nolan/projects/happy-place-platform/package.json 2>/dev/null
