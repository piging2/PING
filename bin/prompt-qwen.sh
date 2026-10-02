#!/bin/bash
# prompt-qwen.sh — send a prompt to Qwen Code headless on the Pig.
# Usage: prompt-qwen.sh "your prompt"   OR   echo "your prompt" | prompt-qwen.sh
# Prints the model response. Prints NOLAN-AUTH-REQUIRED and exits 3 if Nolan must log in first.
set -u
PROMPT="$*"
if [ -z "$PROMPT" ] && [ ! -t 0 ]; then PROMPT="$(cat)"; fi
if [ -z "$PROMPT" ]; then echo "usage: $0 <prompt> (args or stdin)" >&2; exit 2; fi
B64="$(printf '%s' "$PROMPT" | base64 -w0)"
# shellcheck disable=SC1091
. "$(dirname "$0")/_pig-ssh.sh"
pig_exec "wsl -u nolan -- bash /home/nolan/.local/bin/prompt-run qwen $B64"
