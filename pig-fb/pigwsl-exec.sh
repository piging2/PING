#!/bin/bash
# Run a bash script on Pig WSL via the Windows SSH hop. Usage: pigwsl-exec.sh -s < script.sh
set -u
exec ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=25 pigwsl wsl -d Ubuntu bash -s -- "$@"
