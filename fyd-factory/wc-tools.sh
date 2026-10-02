cd /home/nolan/projects/ping
echo "=== tsx/ts-node/jest ==="
ls node_modules/.bin/ 2>/dev/null | grep -E '^(tsx|ts-node|jest|tsc)$' | head
echo "=== tsconfig paths alias @/* ==="
grep -n '"@/\*"' tsconfig.json 2>/dev/null
echo "=== node version ==="
node --version
