#!/bin/bash
# oracle-ssh.sh -- run commands on Oracle (ubuntu@129.146.60.17) via the Pig WSL hop.
# Chain: this cloud machine -> ssh pigwsl (Windows OpenSSH) -> wsl -> ssh ubuntu@Oracle.
# Usage:
#   oracle-ssh.sh <simple command words...>        # no shell metachars
#   oracle-ssh.sh -s < local_script.sh             # run a whole bash script via stdin (preferred for anything complex)
# Never pass secrets as arguments; they would land in process lists on two machines.
set -u
PIG_SSH=(ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=25 pigwsl)
ORACLE_SSH=(wsl ssh -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=10 ubuntu@129.146.60.17)
if [ "${1:-}" = "-s" ]; then
  shift
  exec "${PIG_SSH[@]}" "${ORACLE_SSH[@]}" bash -s -- "$@"
fi
exec "${PIG_SSH[@]}" "${ORACLE_SSH[@]}" "$@"
