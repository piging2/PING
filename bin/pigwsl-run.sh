#!/bin/bash
# Run a bash script inside pig WSL via the Windows ssh target.
# Usage: pigwsl-run.sh <script-file>   (reads script from file to avoid quoting hell)
set -u
SCRIPT_FILE="$1"
B64=$(base64 -w0 < "$SCRIPT_FILE")
ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=60 pigwsl "wsl -- bash -c \"echo $B64 | base64 -d | bash\""
