#!/bin/bash
cd /home/nolan/ping
echo "=== execution_authority run_command body ==="; sed -n '56,110p' runtime/authorities/execution_authority.py
echo "=== intents/execution manifest ==="; head -25 intents/execution/intent-manifest.yaml
