#!/bin/bash
# pig.sh: run a bash command in WSL on the Pig as user nolan (the account with the distro).
# Usage: pig.sh '<inner bash command>'
# RULES: the inner command is wrapped in ONE pair of literal double quotes for cmd.exe.
#   - Use single quotes (never double) for quoting inside.
#   - Pipes are fine (they stay inside the outer quotes).
set -u
inner="$1"
exec ssh -F /home/hatch/.ssh/pig-config -o ConnectTimeout=30 pigwsl "wsl -- bash -c \"$inner\""
