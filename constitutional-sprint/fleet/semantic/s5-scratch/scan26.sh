#!/bin/bash
cd /home/nolan/ping
echo "=== intent/ vs intents/ compare ==="; head -20 intent/capability.intent.yaml; echo ---; head -25 intents/capability/intent-manifest.yaml
echo "=== BaseWorker ==="; grep -rln "class BaseWorker" --include='*.js' ping-runtime/ gateway/ 2>/dev/null | grep -v node_modules | head -3
echo "=== 12 dead mission impls? ==="; grep -rln "class.*Mission" --include='*.js' ping-runtime/ gateway/ 2>/dev/null | grep -v node_modules | head -20
