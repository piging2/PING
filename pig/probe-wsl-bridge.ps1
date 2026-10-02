$ErrorActionPreference = 'SilentlyContinue'
function Probe($url) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 10
    return [string][int]$r.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { return [string][int]$resp.StatusCode } else { return '-1' }
  }
}
'wsl-localhost=' + (Probe 'http://127.0.0.1:3100/')
'wsl-ip=' + (Probe 'http://172.21.65.209:3100/')
