# ce001-find.ps1 - find mission runtime files on Pig filesystem
$ErrorActionPreference = 'Continue'

Write-Host "=== filesystem search for mission_runtime.js ==="
Get-ChildItem -Path C:\Users\nolan -Recurse -Filter mission_runtime.js -ErrorAction SilentlyContinue -Force | Select-Object -ExpandProperty FullName | Select-Object -First 10

Write-Host ""
Write-Host "=== filesystem search for unified_event_runtime.js ==="
Get-ChildItem -Path C:\Users\nolan -Recurse -Filter unified_event_runtime.js -ErrorAction SilentlyContinue -Force | Select-Object -ExpandProperty FullName | Select-Object -First 10

Write-Host ""
Write-Host "=== check main repo for MISSION_COMPLETED ==="
Set-Location C:\Users\nolan\PING
git grep -l 'MISSION_COMPLETED' 2>$null | Select-Object -First 10
Write-Host "(end)"

Write-Host ""
Write-Host "=== check WSL presence ==="
Get-Command wsl.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
