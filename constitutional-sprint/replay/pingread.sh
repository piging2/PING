#!/bin/bash
# pingread.sh <relpath> -- dumps a file from /home/nolan/ping to stdout (read-only)
ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cat /home/nolan/ping/'"$1"'"'
