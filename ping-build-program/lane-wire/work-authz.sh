#!/bin/bash
# Does the exterior auth middleware enforce capability checks on /ingest?
# Print the middleware() function (redact nothing: this is code, not secrets)
G=/home/nolan/ping-gateway-src
grep -n "middleware\|capabilit" "$G/gateway/exterior_auth_middleware.js" | head -20
sed -n "$(grep -n 'middleware()' "$G/gateway/exterior_auth_middleware.js" | head -1 | cut -d: -f1),+45p" "$G/gateway/exterior_auth_middleware.js"
