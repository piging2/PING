echo "=== live container: recursive sha256 of /app/gateway (this may take a bit) ==="
docker exec ping-gateway sh -c 'cd /app/gateway && find . -type f | sort | xargs sha256sum 2>/dev/null' > live_gateway_sums.txt
wc -l live_gateway_sums.txt
echo "=== source recursive sha256 ==="
cd /home/nolan/ping-gateway-src/gateway && find . -type f | sort | xargs sha256sum 2>/dev/null > /home/hatch/workspace/gw-rep/src_gateway_sums.txt
wc -l /home/hatch/workspace/gw-rep/src_gateway_sums.txt
