echo "=== source: middleware presence ==="
find /home/nolan/ping-gateway-src -name '*exterior*' 2>/dev/null
echo "=== source: events mount lines ==="
grep -n "events" /home/nolan/ping-gateway-src/gateway/gateway_runtime.js | head -20
echo "=== source: middleware import in runtime ==="
grep -n "exteriorAuth\|exterior_auth" /home/nolan/ping-gateway-src/gateway/gateway_runtime.js | head -10
echo "=== source: sibling route mounts (with/without middleware) ==="
grep -n "app.use('/" /home/nolan/ping-gateway-src/gateway/gateway_runtime.js | head -40
