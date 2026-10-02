#!/bin/bash
# pig-rsync.sh: rsync remote shell tunneling through the Pig SSH bridge into Pig WSL.
# The SSH endpoint is the Windows host; commands are forwarded into WSL via `wsl -- bash -c`.
# usage: rsync -az -e /home/hatch/workspace/pig/pig-rsync.sh /src/ pigwsl:/home/nolan/dest/
# The host argument must exist in /home/hatch/.ssh/pig-config (pigwsl).
set -u
host="${1:?host required}"
shift
remote_cmd="$*"
# Fail fast on silent tunnel death (2026-09-24): the egress proxy sometimes
# drops the CONNECT tunnel without closing the socket. ServerAlive probes
# detect that in ~90s (30s x 3) so a stalled rsync exits 255 instead of
# hanging until the scheduler kills the run. --timeout=120 on the rsync side
# covers I/O stalls below the ssh layer.
exec ssh -F /home/hatch/.ssh/pig-config -o ServerAliveInterval=30 -o ServerAliveCountMax=3 "$host" "wsl -- bash -c \"$remote_cmd\""
