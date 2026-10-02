#!/bin/bash
# prompt-aider.sh — send a prompt to Aider headless on the Pig.
# Usage: prompt-aider.sh "your prompt"   OR   echo "your prompt" | prompt-aider.sh
# NOTE: aider-chat does not install on the Pig's Python 3.14 and always needs a
# provider API key from Nolan. This wrapper prints NOLAN-AUTH-REQUIRED and exits 3.
set -u
PROMPT="$*"
if [ -z "$PROMPT" ] && [ ! -t 0 ]; then PROMPT="$(cat)"; fi
if [ -z "$PROMPT" ]; then echo "usage: $0 <prompt> (args or stdin)" >&2; exit 2; fi
B64="$(printf '%s' "$PROMPT" | base64 -w0)"
# shellcheck disable=SC1091
. "$(dirname "$0")/_pig-ssh.sh"
pig_exec "wsl -u nolan -- bash /home/nolan/.local/bin/prompt-run aider $B64"
