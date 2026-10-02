#!/bin/bash
# Usage: export SSH_PROXY_PASS set before calling this script.
[ -n "$SSH_PROXY_PASS" ] || { echo "SSH_PROXY_PASS not set" >&2; exit 2; }
exec ssh -o BatchMode=yes -o ConnectTimeout=20 -o IdentityFile=/home/hatch/.ssh/id_ed25519 -o UserKnownHostsFile=/home/hatch/workspace/pig/known_hosts -o ProxyCommand="socat - PROXY:hatch-egress-proxy:%h:%p,proxyport=3130,proxyauth=hatch-runtime:\$SSH_PROXY_PASS" nolan@100.79.154.43 "$@"
