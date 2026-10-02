#!/bin/bash
# _pig-ssh.sh — shared SSH to the Pig for the prompt-* wrappers.
# Source this from a wrapper, then call pig_exec "<remote command>".
# Override via PIG_SSH_KEY / PIG_KNOWN_HOSTS / PIG_HOST env vars if needed.
PIG_SSH_KEY="${PIG_SSH_KEY:-/home/hatch/.ssh/id_ed25519}"
PIG_KNOWN_HOSTS="${PIG_KNOWN_HOSTS:-/home/hatch/workspace/pig/known_hosts}"
PIG_HOST="${PIG_HOST:-nolan@100.79.154.43}"
pig_exec() {
  # stdin closed: remote tools (opencode) hang if stdin is left open
  exec ssh -i "$PIG_SSH_KEY" -o BatchMode=yes -o ConnectTimeout=25 \
    -o UserKnownHostsFile="$PIG_KNOWN_HOSTS" \
    -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
    "$PIG_HOST" "$1" < /dev/null
}
