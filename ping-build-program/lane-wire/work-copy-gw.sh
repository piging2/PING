#!/bin/bash
set -e
cp /home/nolan/ping-gateway-src/gateway/generated/event_registry.json /mnt/c/Users/nolan/transfer/event_registry.json
cp /home/nolan/ping-gateway-src/gateway/routes/ingest.js /mnt/c/Users/nolan/transfer/ingest-route.js
cp /home/nolan/ping-gateway-src/ping-runtime/canonicalization/canonicalization_service.js /mnt/c/Users/nolan/transfer/canon-svc.js
# also copy the live container's copies to compare (container code == disk was proven in phase0, but re-verify cheaply)
sha256sum /home/nolan/ping-gateway-src/ping-runtime/events/unified_event_runtime.js
ls -la /mnt/c/Users/nolan/transfer/event_registry.json
