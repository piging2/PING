#!/usr/bin/env bash
# ORCA control-loop launcher (Pig WSL).
# Resolves PG credentials at the process boundary from the live gateway
# container env. Values never touch disk, logs, or tool output.
set -euo pipefail
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-ping_runtime}"
export PGPASSWORD="$(docker exec ping-gateway printenv POSTGRES_PASSWORD)"
exec node /home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js "$@"
