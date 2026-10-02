#!/bin/bash
# piggrep.sh <dir> <pattern> -- recursive grep on the Pig (read-only), literal pattern
DIR="$1"
PAT="$2"
ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cd '"$DIR"' && grep -rln -F -- '"'"$PAT"'"' . 2>/dev/null"' | head -40
