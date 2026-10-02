#!/bin/bash
# pig-wsl-ssh.sh -- run commands on the Pig's WSL (user nolan).
# Chain: this cloud machine -> ssh pigwsl (Windows OpenSSH) -> wsl.
# Usage:
#   pig-wsl-ssh.sh -s < local_script.sh    # run a whole bash script via stdin (preferred)
#   pig-wsl-ssh.sh <simple words...>       # simple commands only, no shell metachars
set -u
if [ "${1:-}" = "-s" ]; then
  shift
  exec ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=25 pigwsl wsl bash -s -- "$@"
fi
exec ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=25 pigwsl wsl "$@"
