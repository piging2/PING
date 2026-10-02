# FYD connectivity diagnostic (Windows side)
Write-Host "=== portproxy ==="
netsh interface portproxy show all
Write-Host "=== forward-3100.ps1 ==="
Get-Content 'C:\ProgramData\FYD\forward-3100.ps1' -ErrorAction SilentlyContinue
Write-Host "=== TCP 3100 to WSL IP ==="
Test-NetConnection -ComputerName 172.21.65.209 -Port 3100 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded, RemoteAddress
Write-Host "=== TCP 3100 to 127.0.0.1 ==="
Test-NetConnection -ComputerName 127.0.0.1 -Port 3100 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded
Write-Host "=== HTTP via Invoke-WebRequest to WSL IP ==="
try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 'http://172.21.65.209:3100/sites/happy-place').StatusCode } catch { 'IWR-ERR: ' + $_.Exception.Message }
Write-Host "=== scheduled task FYD-Tailscale-3100 ==="
Get-ScheduledTask -TaskName 'FYD-Tailscale-3100' -ErrorAction SilentlyContinue | Select-Object TaskName, State
