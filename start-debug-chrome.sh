# Start Windows Chrome headless with a remote debugging port, detached.
CHROME='/mnt/c/Program Files/Google/Chrome/Application/chrome.exe'
PROF='/mnt/c/Users/nolan/transfer/chrome-debug-profile'
mkdir -p "$PROF"
"$CHROME" --headless=new --remote-debugging-port=9333 "--user-data-dir=$PROF" --no-first-run --no-default-browser-check about:blank > /mnt/c/Users/nolan/transfer/chrome-debug.log 2>&1 &
echo "chrome pid: $!"
sleep 4
# probe the CDP endpoint from WSL
curl -s -m 5 http://127.0.0.1:9333/json/version | head -c 300; echo
