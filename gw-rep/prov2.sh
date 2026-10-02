echo "=== src dir ==="
ls -la /home/nolan/ping-gateway-src | head -20
echo "=== git state ==="
cd /home/nolan/ping-gateway-src && git log --oneline -8 2>&1 | head -10
echo "=== branches ==="
git branch -a 2>&1 | head -20
echo "=== rev fffe99f7a ==="
git rev-parse fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f 2>&1
git log --oneline -3 fffe99f7a 2>&1 | head -5
echo "=== HEAD ==="
git rev-parse HEAD 2>&1
