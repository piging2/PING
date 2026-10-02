#!/bin/bash
cmd.exe /c "C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe C:\Users\nolan\transfer\visual-deep.js" < /dev/null > /mnt/c/Users/nolan/transfer/visual/deep.log 2>&1
echo "exit: $?"; cat /mnt/c/Users/nolan/transfer/visual/deep.log
