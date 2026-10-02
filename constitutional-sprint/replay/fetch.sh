#!/bin/bash
# fetch.sh <remote-relpath> -- dumps file content to stdout for local capture
ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cd /home/nolan/projects/ping-constitutional && cat '"$1"'"'
