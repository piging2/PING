echo "=== bootstrap dir ==="
ls /home/nolan/ping-gateway-src/gateway/bootstrap/ 2>/dev/null | head
echo "=== find gateway_runtime.js ==="
find /home/nolan/ping-gateway-src -name 'gateway_runtime.js' 2>/dev/null
echo "=== find events.js under routes ==="
find /home/nolan/ping-gateway-src/gateway/routes -name 'events.js' 2>/dev/null
