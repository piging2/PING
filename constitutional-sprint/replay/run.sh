#!/bin/bash
# run.sh <remote-cmd> -- runs remote-cmd in ping-constitutional on the Pig.
# Output streams to stdout; redirect/capture locally here.
ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c "cd /home/nolan/projects/ping-constitutional && '"$1"'"'
