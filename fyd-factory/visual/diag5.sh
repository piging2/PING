#!/bin/bash
echo "--- sandbox playwright-core size:"
du -sh /home/hatch/workspace/fyd-deploy/node_modules/playwright-core 2>/dev/null
echo "--- pig node_modules candidates:"
powershell.exe -NoProfile -Command "
foreach (\$d in @('C:\Users\nolan\.local\share\pigi', 'C:\Users\nolan\transfer')) {
  if (Test-Path \$d) {
    Get-ChildItem -Path \$d -Directory -ErrorAction SilentlyContinue | ForEach-Object { 'DIR ' + \$_.FullName }
  } else { 'MISSING ' + \$d }
}
" < /dev/null 2>&1 | head -20
echo "--- end"
