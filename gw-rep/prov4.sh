echo "=== gateway dir ==="
ls /home/nolan/ping-gateway-src/gateway/
echo "=== find runtime files ==="
find /home/nolan/ping-gateway-src -name '*gateway_runtime*' -o -name '*bootstrap*' | head
