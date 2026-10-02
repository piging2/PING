cd /home/nolan/projects/ping-constitutional
echo "=== top-level ==="
ls -la
echo "=== src tree depth 2 ==="
find src -maxdepth 2 -type d 2>/dev/null | sort
echo "=== package.json deps ==="
cat package.json 2>/dev/null
