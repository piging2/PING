#!/bin/bash
# Run a script on Pig WSL via ssh stdin. Usage: pig.sh [script-file] or pipe script to stdin.
if [ $# -ge 1 ]; then
  ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -- bash -s" < "$1"
else
  ssh -F /home/hatch/.ssh/pig-config pigwsl "wsl -- bash -s"
fi
