#!/bin/bash
powershell.exe -NoProfile -Command "
Remove-Item -Recurse -Force 'C:\Users\nolan\transfer\visual' -ErrorAction SilentlyContinue
Remove-Item -Force 'C:\Users\nolan\transfer\visual-capture.js','C:\Users\nolan\transfer\visual-zoom.js','C:\Users\nolan\transfer\visual-deep.js','C:\Users\nolan\transfer\visual-motion.js' -ErrorAction SilentlyContinue
'cleaned'
" < /dev/null 2>&1
echo "--- verify:"
powershell.exe -NoProfile -Command "
if (Test-Path 'C:\Users\nolan\transfer\visual') { 'STILL EXISTS' } else { 'visual dir gone' }
Get-ChildItem 'C:\Users\nolan\transfer\visual-*.js' -ErrorAction SilentlyContinue | ForEach-Object { 'LEFTOVER ' + \$_.Name }
'verify done'
" < /dev/null 2>&1
