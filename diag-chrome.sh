cat /mnt/c/Users/nolan/transfer/chrome-debug.log 2>/dev/null | head -20
echo "=== netstat on windows ==="
powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 9333 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State | Format-Table -HideTableHeaders" 2>/dev/null | head -5
echo "=== chrome processes ==="
powershell.exe -NoProfile -Command "Get-Process chrome -ErrorAction SilentlyContinue | Select-Object Id,StartTime | Format-Table -HideTableHeaders" 2>/dev/null | head -8
