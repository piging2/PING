# Rotation verification — 2026-09-28 (no key material ever printed)
$ErrorActionPreference = 'Stop'
function Get-EnvVal($envs, $name) {
  $m = $envs | Where-Object { $_ -like "$name=*" } | Select-Object -First 1
  if (-not $m) { throw "env var $name not found" }
  return $m.Substring($name.Length + 1)
}
function Sha256Hex($s) {
  $h = [System.Security.Cryptography.SHA256]::Create()
  return (( $h.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($s)) | ForEach-Object { $_.ToString('x2') }) -join '')
}
function Probe($path, $key) {
  $headers = @{}
  if ($key) { $headers['Authorization'] = "Bearer $key" }
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://localhost:8080$path" -Headers $headers -TimeoutSec 15
    return [int]$r.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { return [int]$resp.StatusCode.value__ }
    return -1
  }
}
function DbScalar($sql) {
  return (($sql | docker exec -i brain-postgres psql -U postgres -d ping_runtime -v ON_ERROR_STOP=1 -tA).Trim())
}

$envNew = docker inspect ping-gateway --format '{{json .Config.Env}}' | ConvertFrom-Json
$envOld = docker inspect ping-gateway-pre-rotate-20260928 --format '{{json .Config.Env}}' | ConvertFrom-Json
$newL1 = Get-EnvVal $envNew 'MUSE_LEVEL_1_KEY'
$newL2 = Get-EnvVal $envNew 'MUSE_LEVEL_2_KEY'
$oldL1 = Get-EnvVal $envOld 'MUSE_LEVEL_1_KEY'
$oldL2 = Get-EnvVal $envOld 'MUSE_LEVEL_2_KEY'
Write-Output "key lengths: new=$($newL1.Length),$($newL2.Length) old=$($oldL1.Length),$($oldL2.Length)"
Write-Output "new differs from old: $((Sha256Hex $newL1) -ne (Sha256Hex $oldL1)) $((Sha256Hex $newL2) -ne (Sha256Hex $oldL2))"

# DB vs container agreement (fingerprint compare, values stay in variables)
$dbL1 = DbScalar "SELECT api_key FROM exterior_agent_credentials WHERE agent_id = 'muse';"
$dbL2 = DbScalar "SELECT api_key FROM exterior_agent_credentials WHERE agent_id = 'muse-level-2';"
$dbMatch = ((Sha256Hex $dbL1) -eq (Sha256Hex $newL1)) -and ((Sha256Hex $dbL2) -eq (Sha256Hex $newL2))
Write-Output "db-matches-container-env: $dbMatch"
if (-not $dbMatch) { throw 'DB/container mismatch' }

$health = Probe '/health' $null
Write-Output "health endpoint reachable: $($health -ne -1) (code=$health)"

$sNewL1 = Probe '/events/stats' $newL1
$sNewL2 = Probe '/events/stats' $newL2
$sOldL1 = Probe '/events/stats' $oldL1
$sOldL2 = Probe '/events/stats' $oldL2
$sNoKey = Probe '/events/stats' $null
Write-Output "smoke: newL1=$sNewL1 newL2=$sNewL2 oldL1=$sOldL1 oldL2=$sOldL2 noKey=$sNoKey"
if ($sNewL1 -ne 200 -or $sNewL2 -ne 200) { throw 'new keys rejected' }
if ($sOldL1 -ne 401 -or $sOldL2 -ne 401) { throw 'old keys still accepted' }

$usedNew = DbScalar "SELECT count(*) FROM exterior_agent_credentials WHERE agent_id IN ('muse','muse-level-2') AND last_used_at IS NOT NULL;"
Write-Output "db rows with last_used_at set after new-key probes: $usedNew"

Write-Output 'VERIFICATION COMPLETE'
