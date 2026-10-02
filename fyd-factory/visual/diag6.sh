#!/bin/bash
echo "--- portable node contents:"
ls /mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/ 2>/dev/null
echo "--- chrome.exe hunt:"
for c in "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
  if [ -f "$c" ]; then echo "FOUND $c"; fi
done
echo "--- playwright-core under pigi node:"
powershell.exe -NoProfile -Command "
\$h = Get-ChildItem -Path 'C:\Users\nolan\.local\share\pigi' -Directory -Recurse -Depth 3 -Filter 'playwright-core' -ErrorAction SilentlyContinue | Select-Object -First 2 -ExpandProperty FullName
if (\$h) { \$h | ForEach-Object { 'PWCORE ' + \$_ } } else { 'PWCORE none under pigi' }
" < /dev/null 2>&1 | head -5
echo "--- end"
