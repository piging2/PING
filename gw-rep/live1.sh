mkdir -p live/app
echo "=== copy key files from live container ==="
docker cp ping-gateway:/app/gateway/bootstrap/gateway_runtime.js live/app/gateway_runtime.js 2>&1
docker cp ping-gateway:/app/gateway/exterior_auth_middleware.js live/app/exterior_auth_middleware.js 2>&1
docker cp ping-gateway:/app/gateway/routes/events.js live/app/events.js 2>&1
echo "=== diff vs on-disk source ==="
diff -q live/app/gateway_runtime.js /home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js && echo "runtime IDENTICAL" || echo "runtime DIFFERS"
echo "=== live /app/gateway listing (names only) ==="
docker exec ping-gateway ls /app/gateway/ | wc -l
docker exec ping-gateway ls /app/gateway/exterior_auth_middleware.js 2>&1
echo "=== live container /app checksums for key files ==="
docker exec ping-gateway sh -c 'sha256sum /app/gateway/bootstrap/gateway_runtime.js /app/gateway/routes/events.js /app/gateway/server.js 2>/dev/null'
echo "=== source checksums ==="
sha256sum /home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js /home/nolan/ping-gateway-src/gateway/routes/events.js /home/nolan/ping-gateway-src/gateway/server.js
