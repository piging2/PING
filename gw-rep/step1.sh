docker ps --filter name=gateway --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'
echo "==="
docker ps -a --filter name=gateway --format '{{.Names}}|{{.Image}}|{{.Status}}'
