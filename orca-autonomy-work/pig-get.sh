#!/bin/bash
# pig-get.sh: fetch a file from Pig WSL to local path (read-only use).
set -euo pipefail
REMOTE="$1"; LOCAL="$2"
mkdir -p "$(dirname "$LOCAL")"
B64=$(~/workspace/pig/pigwsl-run.sh "base64 -w0 '$REMOTE'")
printf '%s' "$B64" | base64 -d > "$LOCAL"
echo "got $LOCAL ($(wc -c < "$LOCAL") bytes)"
