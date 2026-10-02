echo "=== WSL eth0 IPv4 ==="
ip -4 -o addr show eth0 | awk '{print $4}'
echo "=== dev server :3100 route checks (WSL side) ==="
for p in "/" "/sites/happy-place" "/objects"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3100$p" 2>/dev/null || echo "CURLFAIL")
  echo "$p -> $code"
done
echo "=== node/next processes ==="
ps aux | grep -E "next|node" | grep -v grep | head -8
echo "=== repo state ==="
git -C /mnt/c/Users/nolan/CascadeProjects/fyd rev-parse --abbrev-ref HEAD 2>/dev/null
git -C /mnt/c/Users/nolan/CascadeProjects/fyd rev-parse --short HEAD 2>/dev/null
git -C /mnt/c/Users/nolan/CascadeProjects/fyd status --porcelain 2>/dev/null | head -5
