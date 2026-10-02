#!/bin/bash
# fyd-dev-ready.sh — read-only FYD dev entrypoint reporter (convergence mode).
# Prints FYD DEV READY with live route status, Ask API status, graph/projection
# source, and HEAD SHAs. NEVER starts, stops, restarts, or modifies anything.
# NEVER prints secrets. Safe to run any time.
set -u

WSL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
BASE="http://${WSL_IP}:3100"
EDGE="http://${WSL_IP}:3101"

probe() { # url -> "UP <code>" or "DOWN"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$1" 2>/dev/null || true)
  if [ "$code" = "200" ]; then echo "UP $code"; else echo "DOWN (${code:-no-response})"; fi
}

ask_probe() { # GET 405 on a POST-only route = route present; honest, no side effects
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE/api/fyd/ask/coppersmith-plumbing" 2>/dev/null || true)
  if [ "$code" = "405" ]; then echo "ROUTE PRESENT (405 on GET = POST-only)"; else echo "UNEXPECTED ($code)"; fi
}

echo "================ FYD DEV READY ================"
echo "Happy Place : $(probe "$BASE/sites/happy-place")  -> $BASE/sites/happy-place"
echo "Coppersmith : $(probe "$BASE/sites/coppersmith-plumbing")  -> $BASE/sites/coppersmith-plumbing"
echo "PING/FYD    : NOT YET GENERATED (Q-P1-03, behind 52-56 convergence)"
echo "Edge proof  : $(probe "$EDGE/sites/coppersmith-plumbing")  -> $EDGE/sites/coppersmith-plumbing"
echo "Ask API     : $(ask_probe)  -> POST $BASE/api/fyd/ask/coppersmith-plumbing"
echo "---"
echo "Graph/projection source: /home/nolan/ping/var/fyd-projections/"
if [ -d /home/nolan/ping/var/fyd-projections ]; then
  ls -t /home/nolan/ping/var/fyd-projections/ 2>/dev/null | head -3 | sed 's/^/  /'
else
  echo "  (projection dir not present on this host)"
fi
echo "---"
echo "HEAD projects/ping : $(git -C /home/nolan/projects/ping rev-parse --short HEAD 2>/dev/null || echo '?') ($(git -C /home/nolan/projects/ping branch --show-current 2>/dev/null || echo '?'))"
echo "HEAD build-edge-port: $(git -C /home/nolan/build-edge-port rev-parse --short HEAD 2>/dev/null || echo '?') ($(git -C /home/nolan/build-edge-port branch --show-current 2>/dev/null || echo '?'))"
echo "================================================"
