param([string]$wslIp)
$urls = @(
  "http://100.79.154.43:3100/sites/happy-place",
  "http://100.79.154.43:3200/sites/happy-place",
  "http://${wslIp}:3100/sites/happy-place",
  "http://${wslIp}:3200/sites/happy-place"
)
foreach ($u in $urls) {
  try { $c = (Invoke-WebRequest -Uri $u -TimeoutSec 8 -UseBasicParsing).StatusCode }
  catch { $c = "ERR " + $_.Exception.Message.Substring(0, 50) }
  Write-Output "$u => $c"
}
