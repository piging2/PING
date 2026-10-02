#!/bin/bash
# Run the Pig forensics capture (read-only) and pull back the evidence.
# Usage: run-forensics.sh
# Remote dir: C:\Users\nolan\pig-incident-2026-09-28  (never C:\Windows\Temp - volatile)
# Local dir: ~/workspace/pig/incident-2026-09-28/capture-<stamp>/
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
RDIR_WIN='C:/Users/nolan/pig-incident-2026-09-28'
RDIR_WSL='/mnt/c/Users/nolan/pig-incident-2026-09-28'
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$HERE/capture-$STAMP"
mkdir -p "$OUT"

echo "[1/4] creating remote dir"
~/workspace/pig/pigwsl-run.sh "mkdir -p ${RDIR_WSL}" >/dev/null

echo "[2/4] uploading forensics-capture.ps1"
~/workspace/pig/pigwsl-put.sh "$HERE/forensics-capture.ps1" "${RDIR_WSL}/forensics-capture.ps1"

echo "[3/4] running capture (read-only, bounded 10 min)"
timeout 600 ~/workspace/pig/pigwsl-run.sh "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ${RDIR_WIN}/forensics-capture.ps1"

echo "[4/4] pulling back evidence"
scp -F /home/hatch/.ssh/pig-config "pigwsl:${RDIR_WSL}/forensics-*.log" "$OUT/" 2>/dev/null || echo "(no log pulled)"
scp -F /home/hatch/.ssh/pig-config "pigwsl:${RDIR_WSL}/sleepstudy.html" "$OUT/" 2>/dev/null || echo "(no sleepstudy pulled)"
scp -F /home/hatch/.ssh/pig-config "pigwsl:${RDIR_WSL}/systemsleepdiagnostics.html" "$OUT/" 2>/dev/null || echo "(no systemsleepdiagnostics pulled)"
echo "evidence in $OUT:"
ls -la "$OUT"
