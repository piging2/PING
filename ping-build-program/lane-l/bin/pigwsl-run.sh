#!/bin/bash
# pigwsl-run: run a bash script on the Pig inside WSL.
# Usage: pigwsl-run.sh [scriptfile]   (reads stdin if no file)
# Commands are base64-encoded to avoid all quoting problems.
INPUT="$(cat "${1:-/dev/stdin}")"
B64="$(printf '%s' "$INPUT" | base64 -w0)"
ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -- bash -c \"echo $B64 | base64 -d | bash\""
