#!/bin/bash
# pigbash: run an arbitrary bash command on the Pig's WSL without quoting hell.
# Usage: pigbash '<bash command>'
# The command is base64-encoded locally; the Pig decodes and pipes to bash.
# Base64 alphabet has no chars special to cmd.exe or bash inside "...", so the
# remote command is: wsl -- bash -c "echo <B64> | base64 -di | bash"
set -u
if [ $# -lt 1 ]; then echo "usage: pigbash <command>" >&2; exit 1; fi
B64=$(printf '%s' "$1" | base64 -w0)
ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "echo '"$B64"' | base64 -di | bash"'
