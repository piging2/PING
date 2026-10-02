#!/bin/bash
# Run a PowerShell snippet on the Pig via pigwsl-exec, dodging all quoting layers.
# The snippet is UTF-16LE/base64-encoded locally; pigwsl-exec only ever sees
# `powershell.exe -EncodedCommand <base64>` (no quotes, no dollars, no pipes).
# Usage: pigps.sh '<powershell code>'  |  echo '<code>' | pigps.sh -
set -u
if [ "${1:-}" = "-" ]; then PSCODE=$(cat); else PSCODE="${1:?usage: pigps.sh <powershell code>}"; fi
B64=$(printf '%s' "$PSCODE" | iconv -f UTF-8 -t UTF-16LE | base64 -w0)
exec ~/workspace/bin/pigwsl-exec "powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand $B64"
