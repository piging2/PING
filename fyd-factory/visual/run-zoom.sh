#!/bin/bash
cmd.exe /c "C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe C:\Users\nolan\transfer\visual-zoom.js C:\Users\nolan\transfer\visual" < /dev/null > /mnt/c/Users/nolan/transfer/visual/zoom.log 2>&1
echo "node exit: $?"
cat /mnt/c/Users/nolan/transfer/visual/zoom.log
ls -la /mnt/c/Users/nolan/transfer/visual/ | grep -E "zoom|forensics"
