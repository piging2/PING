#!/bin/bash
cd /home/nolan/ping
echo "=== KernelReplayExecutionProvider ==="; grep -rln "KernelReplayExecutionProvider" --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v worktrees | head -5
