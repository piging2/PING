#!/bin/bash
# Deploy the canonical broker copy (this repo) to the Pig's WSL working copy
# at ~/copilot-broker, preserving Pig-side state/ and rebuilding node_modules.
# Run from the cloud machine that hosts ~/workspace/pig-fb/copilot-broker.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SSH_CFG=/home/hatch/.ssh/pig-config
SSH_BASE="ssh -F $SSH_CFG -o BatchMode=yes -o ConnectTimeout=25 pigwsl"

echo "shipping broker to Pig WSL..."
tar --exclude=node_modules --exclude=state -czf - -C "$HERE" . \
  | $SSH_BASE wsl -d Ubuntu bash -c "mkdir -p ~/copilot-broker && tar xzf - -C ~/copilot-broker"

echo "installing pinned dependencies on the Pig..."
$SSH_BASE wsl -d Ubuntu bash -c "export PATH=\$HOME/.local/node-v22.23.2-linux-x64/bin:\$PATH && cd ~/copilot-broker && npm install --no-audit --no-fund"
echo "deploy done"
