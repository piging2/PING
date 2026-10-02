#!/bin/bash
RPID=$(cat /home/nolan/fyd-compile-harness/pilot20.pid)
kill -9 "$RPID" 2>/dev/null
sleep 1
if kill -0 "$RPID" 2>/dev/null; then echo "STILL ALIVE"; else echo "KILLED"; fi
