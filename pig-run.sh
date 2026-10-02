#!/bin/bash
# Run a bash script inside Pig WSL safely (base64 avoids cmd.exe metachar quoting).
# Usage: pig-run.sh <script-file>   OR   echo 'cmds' | pig-run.sh
SCRIPT="$(cat "${1:-/dev/stdin}")"
B64="$(printf '%s' "$SCRIPT" | base64 -w0)"
ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -d Ubuntu bash -c \"echo $B64 | base64 -d | bash\""
