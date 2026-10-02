#!/bin/bash
# STEP 8b: scan tarball-adjacent logs for credential-looking values before transfer.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "--- grep for credential patterns in build logs staged in worktree ---"
grep -rniE "api[_-]?key|secret|token|password|bearer" "$WT/npm-ci.log" "$WT/next-build-early.log" 2>/dev/null | grep -viE "NEXT_TELEMETRY_DISABLED|public|pathname" | head -10
echo "(exit $?)"
echo "--- env files present in tar? ---"
ls -la "$WT/.env"* 2>/dev/null
echo "--- scratch/quarantine sizes ---"
du -sh "$WT/scratch" "$WT/quarantine-fyd-media" "$WT/portal-proof" "$WT/research" 2>/dev/null
