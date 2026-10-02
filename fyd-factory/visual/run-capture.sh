#!/bin/bash
mkdir -p /mnt/c/Users/nolan/transfer/visual
cmd.exe /c "C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe C:\Users\nolan\transfer\visual-capture.js happy-place C:\Users\nolan\transfer\visual" < /dev/null > /mnt/c/Users/nolan/transfer/visual/capture.log 2>&1
echo "node exit: $?"
echo "--- capture.log:"
cat /mnt/c/Users/nolan/transfer/visual/capture.log
echo "--- files:"
ls -la /mnt/c/Users/nolan/transfer/visual/
