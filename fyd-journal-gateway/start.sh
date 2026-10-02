#!/bin/bash
# Start the FYD journal gateway on 127.0.0.1:18199 (idempotent).
# Safe to re-run: if something already listens on 18199, it exits 0.
set -u
PORT="${FYD_JOURNAL_PORT:-18199}"
if (exec 3<>/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  echo "fyd-journal-gateway: already listening on 127.0.0.1:$PORT"
  exit 0
fi
DIR="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "fyd-journal-gateway: node not found on PATH" >&2
  exit 1
fi
# setsid fully detaches from the launching ssh/wsl session so the gateway
# survives when the remote shell exits; stdio is fully redirected.
setsid nohup node "$DIR/server.mjs" < /dev/null >> "$DIR/gateway.log" 2>&1 &
echo "fyd-journal-gateway: started pid $! on 127.0.0.1:$PORT (log: $DIR/gateway.log)"
