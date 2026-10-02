#!/bin/bash
# pig-pull.sh <remote-pig-path> <local-path> : base64-copy a file from Pig WSL to this sandbox
set -e
REMOTE="$1"; LOCAL="$2"
~/workspace/pig/pigwsl-run.sh "base64 -w0 '$REMOTE'" < /dev/null | python3 -c "import sys,base64; sys.stdout.buffer.write(base64.b64decode(sys.stdin.read().strip()))" > "$LOCAL"
echo "pulled -> $LOCAL ($(wc -c < "$LOCAL") bytes)"
