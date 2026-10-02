#!/bin/bash
# Helper: run a command in WSL on the Pig (read-only usage for swarm-10).
# Usage: pig.sh '<bash command>'
ssh -F /home/hatch/.ssh/pig-config -o ConnectTimeout=25 pigwsl "wsl -- bash -c \"$1\""
