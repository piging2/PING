R=/home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js
echo "=== line 790 area ==="
sed -n '775,810p' "$R"
echo "=== all app.use mounts ==="
grep -n "app.use('/" "$R" | head -60
