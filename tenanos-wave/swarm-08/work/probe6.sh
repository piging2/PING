#!/bin/bash
# swarm-08 probe 6: locate runtime sources + getStats implementations (read-only)
set -u
echo "=== find mission runtime ==="
timeout 60 find /home/nolan/ping -name '*mission*runtime*' -o -name '*MissionRuntime*' 2>/dev/null | grep -v node_modules | grep -v worktrees | head -10
echo "=== find unified event runtime ==="
timeout 60 find /home/nolan/ping -name '*unified*event*' -not -path '*/node_modules/*' 2>/dev/null | grep -v worktrees | head -10
echo "=== find worker runtime / scheduler ==="
timeout 60 find /home/nolan/ping -name '*worker_runtime*' -o -name '*WorkerRuntime*' -o -name '*mission_scheduler*' -o -name '*MissionScheduler*' 2>/dev/null | grep -v node_modules | grep -v worktrees | head -12
