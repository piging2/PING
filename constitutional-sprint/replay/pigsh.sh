#!/bin/bash
# Helper: run a command in the ping-constitutional worktree on the Pig.
# Usage: pigsh '<cmd without pipes>'
REPO="/home/nolan/projects/ping-constitutional"
ssh -F /home/hatch/.ssh/pig-config pigwsl wsl -- bash -c "cd ${REPO} && $1"
