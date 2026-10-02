#!/bin/bash
F=/opt/ping/infrastructure/oracle/docker-compose.oracle.yml
echo "== services in compose =="
grep -E "^  [a-z0-9_-]+:" "$F" | sed 's/://' | head -40
echo "== full compose (truncated 120 lines) =="
head -120 "$F"
