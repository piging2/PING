# Gateway MUSE_LEVEL_*_KEY rotation — 2026-09-28
# No key material is ever printed. Only booleans, counts, and HTTP status codes leave this session.
$ErrorActionPreference = 'Stop'

function Get-EnvVal($envs, $name) {
  $m = $envs | Where-Object { $_ -like "$name=*" } | Select-Object -First 1
  if (-not $m) { throw "env var $name not found on ping-gateway" }
  return $m.Substring($name.Length + 1)
}
function New-ApiKey {
  $b = New-Object byte[] 50
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return [Convert]::ToBase64String($b).Replace('+','-').Replace('/','_').TrimEnd('=')
}
function Sha256Hex($s) {
  $h = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($s)
  return (($h.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join '')
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
function DbQuery($sql) {
  return ($sql | docker exec -i brain-postgres psql -U postgres -d ping_runtime -v ON_ERROR_STOP=1 -tA)
}

Write-Output 'STEP 1: capture current keys from running container'
$envs = docker inspect ping-gateway --format '{{json .Config.Env}}' | ConvertFrom-Json
$oldL1 = Get-EnvVal $envs 'MUSE_LEVEL_1_KEY'
$oldL2 = Get-EnvVal $envs 'MUSE_LEVEL_2_KEY'
$otherEnv = $envs | Where-Object { $_ -notlike 'MUSE_LEVEL_1_KEY=*' -and $_ -notlike 'MUSE_LEVEL_2_KEY=*' }
Write-Output "old key lengths: $($oldL1.Length),$($oldL2.Length)"

Write-Output 'STEP 2: pre-rotation baseline'
$preNew = Probe '/events/stats' $oldL1
$preNoKey = Probe '/events/stats' $null
Write-Output "pre: valid-key=$preNew no-key=$preNoKey"
if ($preNew -ne 200 -or $preNoKey -ne 401) { throw "pre-rotation baseline unexpected (valid=$preNew no-key=$preNoKey)" }
$preRows = DbQuery "SELECT count(*) FROM exterior_agent_credentials WHERE is_active = true;"
Write-Output "pre: active credential rows=$preRows"

Write-Output 'STEP 3: generate new keys'
$newL1 = New-ApiKey; $newL2 = New-ApiKey
if ($newL1.Length -ne 67 -or $newL2.Length -ne 67) { throw 'new key bad length' }
if ($newL1 -eq $newL2 -or $newL1 -eq $oldL1 -or $newL2 -eq $oldL2) { throw 'new key collision' }
Write-Output 'new keys generated (lengths 67,67; values not shown)'

Write-Output 'STEP 4: update DB rows in one transaction'
$sql = @"
BEGIN;
UPDATE exterior_agent_credentials SET api_key = '$newL1', last_used_at = NULL WHERE agent_id = 'muse';
UPDATE exterior_agent_credentials SET api_key = '$newL2', last_used_at = NULL WHERE agent_id = 'muse-level-2';
COMMIT;
"@
$sql | docker exec -i brain-postgres psql -U postgres -d ping_runtime -v ON_ERROR_STOP=1 | Out-Null
$newCount = DbQuery "SELECT count(*) FROM exterior_agent_credentials WHERE api_key IN ('$newL1','$newL2');"
$oldCount = DbQuery "SELECT count(*) FROM exterior_agent_credentials WHERE api_key IN ('$oldL1','$oldL2');"
Write-Output "post-db: new-key rows=$newCount old-key rows=$oldCount"
if ($newCount.Trim() -ne '2' -or $oldCount.Trim() -ne '0') { throw 'DB verification failed' }

Write-Output 'STEP 5: recreate gateway container with new env (via --env-file, no secrets on command lines)'
$envFile = Join-Path $env:TEMP ('gw-rotate-' + [Guid]::NewGuid().ToString('N') + '.env')
try {
  $lines = @()
  foreach ($e in $otherEnv) { $lines += $e }
  $lines += "MUSE_LEVEL_1_KEY=$newL1"
  $lines += "MUSE_LEVEL_2_KEY=$newL2"
  [System.IO.File]::WriteAllLines($envFile, $lines)
  $dockerArgs = @('run','-d','--name','ping-gateway','--restart','unless-stopped','-p','8080:8080','--network','pig-promotion_default','-v','muse-workspace:/app/workspace/muse','--env-file',$envFile,'ping-gateway:repair-cert-20260924')
  docker stop ping-gateway | Out-Null
  docker rename ping-gateway ping-gateway-pre-rotate-20260928 | Out-Null
  & docker @dockerArgs | Out-Null
  Write-Output 'new container started'
} finally {
  if (Test-Path $envFile) { Remove-Item $envFile -Force }
}

$healthy = $false
for ($i = 0; $i -lt 18; $i++) {
  Start-Sleep -Seconds 5
  $code = Probe '/health' $null
  if ($code -eq 200) { $healthy = $true; break }
}
if (-not $healthy) { throw 'new gateway did not reach /health in 90s' }
Write-Output 'new gateway /health reachable'

Write-Output 'STEP 6: verify container env carries new keys (fingerprint compare)'
$envs2 = docker inspect ping-gateway --format '{{json .Config.Env}}' | ConvertFrom-Json
$envL1 = Get-EnvVal $envs2 'MUSE_LEVEL_1_KEY'
$envL2 = Get-EnvVal $envs2 'MUSE_LEVEL_2_KEY'
$fpMatch = (Sha256Hex $envL1) -eq (Sha256Hex $newL1) -and (Sha256Hex $envL2) -eq (Sha256Hex $newL2)
Write-Output "env fingerprint match=$fpMatch"
if (-not $fpMatch) { throw 'container env does not carry new keys' }

Write-Output 'STEP 7: auth smoke tests'
$sNewL1 = Probe '/events/stats' $newL1
$sNewL2 = Probe '/events/stats' $newL2
$sOldL1 = Probe '/events/stats' $oldL1
$sOldL2 = Probe '/events/stats' $oldL2
Write-Output "smoke: newL1=$sNewL1 newL2=$sNewL2 oldL1=$sOldL1 oldL2=$sOldL2"
if ($sNewL1 -ne 200 -or $sNewL2 -ne 200) { throw 'new keys rejected' }
if ($sOldL1 -ne 401 -or $sOldL2 -ne 401) { throw 'old keys still accepted' }

Write-Output 'STEP 8: DB confirms new-key authentication touched rows'
$used = DbQuery "SELECT count(*) FROM exterior_agent_credentials WHERE api_key IN ('$newL1','$newL2') AND last_used_at IS NOT NULL;"
Write-Output "new-key rows with last_used_at set=$used"

Write-Output 'ROTATION COMPLETE'
