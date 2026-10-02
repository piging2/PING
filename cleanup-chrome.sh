# cleanup the debug chrome attempt
powershell.exe -NoProfile -Command "Stop-Process -Id 9160 -Force -ErrorAction SilentlyContinue" 2>/dev/null
echo "killed debug chrome"
# confirm the house CDP endpoint is alive from WSL
curl -s -m 8 http://127.0.0.1:9223/json/version | head -c 200; echo
