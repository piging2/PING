#!/bin/bash
# pigwsl-run: run a bash script on Pig Ubuntu WSL via base64 (avoids cmd.exe quote mangling)
# usage: pigwsl-run.sh 'script...'
B64=$(printf '%s' "$1" | base64 -w0)
ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -- bash -c \"echo ${B64} | base64 -d | bash -s\""
