echo "=== diff runtime (live vs source) head ==="
diff live/app/gateway_runtime.js /home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js | head -60
echo "=== live /events mount line ==="
grep -n "app.use('/events'" live/app/gateway_runtime.js | head -5
echo "=== source /events mount line ==="
grep -n "app.use('/events'" /home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js | head -5
