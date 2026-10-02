#!/bin/bash
# prompt-opencode.sh — send a prompt to OpenCode headless on the Pig.
# Usage: prompt-opencode.sh "your prompt"   OR   echo "your prompt" | prompt-opencode.sh
# Prints the model response. Prints NOLAN-AUTH-REQUIRED and exits 3 if Nolan must log in first.
set -u
PROMPT="$*"
if [ -z "$PROMPT" ] && [ ! -t 0 ]; then PROMPT="$(cat)"; fi
if [ -z "$PROMPT" ]; then echo "usage: $0 <prompt> (args or stdin)" >&2; exit 2; fi
B64="$(printf '%s' "$PROMPT" | base64 -w0)"
# shellcheck disable=SC1091
. "$(dirname "$0")/_pig-ssh.sh"
pig_exec "wsl -u nolan -- bash /home/nolan/.local/bin/prompt-run opencode $B64"
