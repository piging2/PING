#!/bin/bash
echo "--- chrome.exe locations:"
cmd.exe /c "where chrome.exe" < /dev/null 2>&1 | head -5
echo "--- playwright-core search (bounded):"
powershell.exe -NoProfile -Command "
\$hits = @()
foreach (\$root in @('C:\Users\nolan\AppData\Local\hermes', 'C:\Users\nolan\workspace\pig-fb', 'C:\tools')) {
  if (Test-Path \$root) {
    \$hits += Get-ChildItem -Path \$root -Directory -Recurse -Depth 4 -Filter 'playwright-core' -ErrorAction SilentlyContinue | Select-Object -First 3 -ExpandProperty FullName
  }
}
\$hits | ForEach-Object { 'PWCORE ' + \$_ }
if (\$hits.Count -eq 0) { 'PWCORE none found' }
" < /dev/null 2>&1 | head -10
echo "--- hermes node dir:"
ls /mnt/c/Users/nolan/AppData/Local/hermes/node/ 2>/dev/null | head -10
