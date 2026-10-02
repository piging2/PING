#!/bin/bash
# pig.sh: run a bash command in WSL on the Pig.
# Usage: pig.sh '<inner bash command>'
# RULE: use single quotes inside the inner command, never double quotes.
# The whole inner command is wrapped in literal double quotes for cmd.exe.
set -u
exec /home/hatch/workspace/bin/pig wsl -- bash -c "\"$1\""
