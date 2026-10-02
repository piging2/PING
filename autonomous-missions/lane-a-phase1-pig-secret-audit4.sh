#!/bin/bash
# READ-ONLY pass 4. NAMES only; values never printed.
set -u
echo "=== Pig ping-gateway creation-time env NAMES (fixed template; names only) ==="
docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' 2>&1 | cut -d= -f1 | sort -u
echo "=== were any secret-ish values passed literally at creation? (INTERPOLATED-vs-LITERAL not applicable here; just flag names) ==="
docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | cut -d= -f1 | grep -iE 'pass|secret|token|key|cred|auth|bearer' | sort -u || echo "(none)"
echo
echo "=== find compose files under /mnt/c/Users/nolan/PING (names only, case-insensitive) ==="
find /mnt/c/Users/nolan/PING -maxdepth 2 -iname '*compose*' 2>/dev/null | head -10
echo
echo "=== vault container: image command (check for -dev flag; no values) ==="
docker inspect ping-vault --format '{{range .Config.Env}}{{println .}}{{end}} {{json .Config.Cmd}} {{json .Args}}' 2>/dev/null | cut -c1-400
