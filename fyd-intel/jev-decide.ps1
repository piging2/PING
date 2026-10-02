param(
  [Parameter(Mandatory=$true)][string]$RequestFile
)
$ErrorActionPreference = 'Stop'
# jev-decide.ps1 — TYPESAFE_JEV provider courier.
#
# This worker is deliberately dumb: it receives an EXACT request
# ({url, body}) built locally from the model contract, POSTs it with the
# key from the existing Hermes secret path, and returns the raw provider
# response. It contains NO model strings, NO endpoint strings, NO profile
# names, and makes NO routing decisions. Model choice lives in
# model_contract.json on the launcher side; attestation happens there too.
# Nothing secret is printed, logged, or passed as an argument.

function Out-Result($obj) {
  $obj | ConvertTo-Json -Depth 10 -Compress
  exit 0
}

$key = $null
foreach ($line in (Get-Content 'C:\Users\nolan\AppData\Local\hermes\.env')) {
  if ($line -match '^\s*OPENROUTER_API_KEY\s*=\s*(.+?)\s*$') {
    $key = $Matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $key) {
  Out-Result @{ ok=$false; error_class='KEY_NOT_FOUND_IN_HERMES_ENV' }
}

try {
  $req = Get-Content $RequestFile -Raw -ErrorAction Stop | ConvertFrom-Json
} catch {
  Out-Result @{ ok=$false; error_class='REQUEST_FILE_UNREADABLE' }
}
$url = "$($req.url)"
if (-not $url) {
  Out-Result @{ ok=$false; error_class='REQUEST_HAS_NO_URL' }
}
$bodyJson = ($req.body | ConvertTo-Json -Depth 10 -Compress)

$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $resp = Invoke-RestMethod -Uri $url -Method Post `
    -Headers @{ Authorization = "Bearer $key"; 'Content-Type'='application/json';
                'HTTP-Referer'='https://ping.social'; 'X-Title'='PING FYD intelligence lane' } `
    -Body $bodyJson -TimeoutSec 60
  $sw.Stop()
  Out-Result @{
    ok=$true
    status_code=200
    latency_ms=$sw.ElapsedMilliseconds
    body=$resp
  }
} catch {
  $sw.Stop()
  $httpStatus = 'unknown'
  try { $httpStatus = [string][int]$_.Exception.Response.StatusCode } catch { }
  $errBody = ''
  try {
    $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    $b = $sr.ReadToEnd()
    $errBody = $b.Substring(0, [Math]::Min(500, $b.Length))
  } catch { }
  Out-Result @{
    ok=$false
    error_class=$_.Exception.GetType().Name
    http_status=$httpStatus
    error_body=$errBody
    latency_ms=$sw.ElapsedMilliseconds
  }
}
