# ce001-pgcheck.ps1 - is any postgres reachable on the Pig (Windows layer)?
$ErrorActionPreference = 'Continue'
Write-Host "=== TCP 5432 localhost ==="
try {
  $c = New-Object Net.Sockets.TcpClient
  $r = $c.BeginConnect('127.0.0.1', 5432, $null, $null)
  $ok = $r.AsyncWaitHandle.WaitOne(4000)
  Write-Host ("5432 open: " + $ok)
  $c.Close()
} catch { Write-Host ("5432 error: " + $_.Exception.Message) }

Write-Host "=== docker availability ==="
try { docker ps 2>&1 | Select-Object -First 3 } catch { Write-Host "docker not available" }

Write-Host "=== node availability ==="
try { node --version } catch { Write-Host "node not available" }
