#!/bin/bash
# Pig WSL shell via ssh config (avoids Windows CMD quote mangling).
# Usage: pigwsl.sh bash -c '...'  -- or --  pigwsl.sh <cmd> [args...]
exec ssh -F /home/hatch/.ssh/pig-config pigwsl wsl -- "$@"
