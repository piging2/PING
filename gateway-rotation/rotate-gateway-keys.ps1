# rotate-gateway-keys.ps1
# Rotates the two exterior bearer keys for the ping-gateway container.
#
# What it does:
#   1. Preconditions: ping-gateway exists on the expected image, ping-gateway-prev2 absent.
#   2. Generates two fresh 256-bit keys (pk_ + 64 hex, same shape as current keys).
#   3. Reads the two exterior_agent_credentials rows (memory only, for rollback).
#   4. Stops + renames ping-gateway -> ping-gateway-prev2 (rollback container, kept stopped).
#   5. UPDATEs the two DB rows to the new keys and verifies.
#   6. Recreates ping-gateway from the SAME image with identical config, new keys in env.
#   7. Waits for readiness, then runs the smoke suite.
#   8. On ANY failure after step 4: restores the old container and rolls the DB back.
#
# The script NEVER prints key values. It exits 0 only on full success.
# Existing ping-gateway-prev (eventauth7) is never touched.

$ErrorActionPreference = 'Stop'

$IMG   = 'curious-squid-gateway:phase4-eventauth8'
$NAME  = 'ping-gateway'
$PREV2 = 'ping-gateway-prev2'
$DB    = 'ping_runtime'
$BASE  = 'http://127.0.0.1:8080'

function Status($m) { Write-Output ("[rotate] " + $m) }
function Fail($m)   { Write-Output ("[rotate] FAILED: " + $m); Write-Output '[rotate] RESULT=FAILED'; exit 1 }

# --- DB helper: SQL travels via stdin pipe (never in process args, never on disk) ---
function DbQ($sql) {
    $out = ($sql | docker exec -i ping-postgres sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U $POSTGRES_USER -d ping_runtime -v ON_ERROR_STOP=1 -tA' 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'db query failed' }
    return $out.Trim()
}

$script:state = 'init'
$script:oldL1 = $null
$script:oldL2 = $null

function Rollback($reason) {
    Status ("ROLLBACK: " + $reason + " (state=" + $script:state + ")")
    try {
        if ($script:state -eq 'recreated') {
            docker rm -f $NAME 2>$null | Out-Null
        }
        if ($script:state -in @('renamed','db-updated','recreated')) {
            docker rename $PREV2 $NAME 2>$null | Out-Null
        }
        if ($script:state -in @('stopped','renamed','db-updated','recreated')) {
            docker start $NAME 2>$null | Out-Null
        }
        if ($script:state -in @('db-updated','recreated')) {
            DbQ ("BEGIN; UPDATE public.exterior_agent_credentials SET api_key='" + $script:oldL1 + "' WHERE agent_id='muse'; " +
                 "UPDATE public.exterior_agent_credentials SET api_key='" + $script:oldL2 + "' WHERE agent_id='muse-level-2'; COMMIT;") | Out-Null
            $rc = DbQ ("SELECT count(*) FROM public.exterior_agent_credentials WHERE (agent_id='muse' AND api_key='" + $script:oldL1 + "') OR (agent_id='muse-level-2' AND api_key='" + $script:oldL2 + "')")
            Status ("db rollback verify count=" + $rc + " (expect 2)")
        }
        $rs = (docker inspect $NAME --format '{{.State.Running}}' 2>$null | Out-String).Trim()
        Status ("old container running=" + $rs)
    } catch {
        Status 'ROLLBACK hit an error; manual inspection required'
    }
    Write-Output '[rotate] RESULT=FAILED'
    exit 1
}

function HttpCode($method, $url, $key, $body) {
    $headers = @{}
    if ($key) { $headers['Authorization'] = 'Bearer ' + $key }
    try {
        if ($body) {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 20
        } else {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 20
        }
        return [int]$r.StatusCode
    } catch {
        $resp = $_.Exception.Response
        if ($null -ne $resp) { return [int]$resp.StatusCode }
        return -99
    }
}

# ---------- 1. preconditions ----------
$names = docker ps -a --format '{{.Names}}'
if (-not ($names | Where-Object { $_ -eq $NAME }))  { Fail "container $NAME not found" }
if ($names | Where-Object { $_ -eq $PREV2 })        { Fail "$PREV2 already exists; refusing to overwrite a rollback container" }
$insp = (docker inspect $NAME | ConvertFrom-Json)[0]
if ($insp.Config.Image -ne $IMG) { Fail ("unexpected image: " + $insp.Config.Image) }
if ((docker inspect $NAME --format '{{.State.Running}}') -ne 'true') { Fail "$NAME is not running" }
Status ("preconditions ok; image=" + $IMG)

# ---------- 2. fresh keys ----------
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
function New-ApiKey {
    $b = New-Object byte[] 32
    $rng.GetBytes($b)
    return ('pk_' + (($b | ForEach-Object { $_.ToString('x2') }) -join ''))
}
$newL1 = New-ApiKey
$newL2 = New-ApiKey
if ($newL1.Length -ne 67 -or $newL2.Length -ne 67) { Fail 'generated key has wrong length' }
if ($newL1 -eq $newL2) { Fail 'generated keys identical; aborting' }
$liveL1 = ((docker exec $NAME printenv MUSE_LEVEL_1_KEY) | Out-String).Trim()
$liveL2 = ((docker exec $NAME printenv MUSE_LEVEL_2_KEY) | Out-String).Trim()
if (($newL1 -eq $liveL1) -or ($newL2 -eq $liveL2)) { Fail 'generated key collides with live key; aborting' }
Status 'fresh 256-bit keys generated (pk_ hex format, differ from live keys)'

# ---------- 3. read existing rows (memory only, for rollback) ----------
try {
    $script:oldL1 = DbQ "SELECT api_key FROM public.exterior_agent_credentials WHERE agent_id='muse'"
    $script:oldL2 = DbQ "SELECT api_key FROM public.exterior_agent_credentials WHERE agent_id='muse-level-2'"
} catch { Fail 'could not read existing credential rows' }
if ($script:oldL1.Length -ne 67 -or $script:oldL2.Length -ne 67) { Fail 'existing credential rows have unexpected shape' }
Status 'existing credential rows located (muse, muse-level-2)'

# ---------- 4. stop + rename current container ----------
docker stop $NAME 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "docker stop $NAME failed" }
$script:state = 'stopped'
docker rename $NAME $PREV2 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Rollback "docker rename to $PREV2 failed" }
$script:state = 'renamed'
Status ("current container preserved as " + $PREV2)

# ---------- 5. update DB rows ----------
try {
    DbQ ("BEGIN; UPDATE public.exterior_agent_credentials SET api_key='" + $newL1 + "' WHERE agent_id='muse'; " +
         "UPDATE public.exterior_agent_credentials SET api_key='" + $newL2 + "' WHERE agent_id='muse-level-2'; COMMIT;") | Out-Null
} catch { Rollback 'DB credential update failed' }
$script:state = 'db-updated'
try {
    $vc = DbQ ("SELECT count(*) FROM public.exterior_agent_credentials WHERE (agent_id='muse' AND api_key='" + $newL1 + "') OR (agent_id='muse-level-2' AND api_key='" + $newL2 + "')")
    if ($vc -ne '2') { throw 'verify count mismatch' }
    $oc = DbQ ("SELECT count(*) FROM public.exterior_agent_credentials WHERE api_key='" + $script:oldL1 + "' OR api_key='" + $script:oldL2 + "'")
    if ($oc -ne '0') { throw 'old keys still present' }
} catch { Rollback 'DB credential verification failed' }
Status 'DB credential rows updated and verified (2 new keys live, 0 old keys remain)'

# ---------- 6. recreate container from same image, cloned config, new keys ----------
$envArgs = @()
foreach ($e in $insp.Config.Env) {
    $idx = $e.IndexOf('=')
    $n = $e.Substring(0, $idx)
    if ($n -eq 'MUSE_LEVEL_1_KEY')     { $v = "MUSE_LEVEL_1_KEY=$newL1" }
    elseif ($n -eq 'MUSE_LEVEL_2_KEY') { $v = "MUSE_LEVEL_2_KEY=$newL2" }
    else { $v = $e }
    $envArgs += '-e'; $envArgs += $v
}
$portArgs = @()
foreach ($p in $insp.HostConfig.PortBindings.PSObject.Properties) {
    foreach ($b in $p.Value) {
        $containerPort = $p.Name.Split('/')[0]
        $portArgs += '-p'
        if ($b.HostIp) { $portArgs += ($b.HostIp + ':' + $b.HostPort + ':' + $containerPort) }
        else { $portArgs += ($b.HostPort + ':' + $containerPort) }
    }
}
$volArgs = @()
foreach ($m in $insp.Mounts) {
    if ($m.Type -eq 'volume') { $volArgs += '-v'; $volArgs += ($m.Name + ':' + $m.Destination) }
    elseif ($m.Type -eq 'bind') { $volArgs += '-v'; $volArgs += ($m.Source + ':' + $m.Destination) }
}
$restartName = $insp.HostConfig.RestartPolicy.Name
$entry = $insp.Config.Entrypoint
$cmd = $insp.Config.Cmd
$runArgs = @('run','-d','--name',$NAME,'--restart',$restartName) + $portArgs + $volArgs + @('--entrypoint') + $entry + $envArgs + @($IMG) + $cmd
& docker $runArgs 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Rollback 'docker run failed' }
$script:state = 'recreated'
Status 'new container created from same image'

# ---------- 7. wait for readiness (unauth 401 on a gated route = serving) ----------
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    $c = HttpCode 'GET' ($BASE + '/orchestration/engine') $null $null
    if ($c -eq 401) { $ready = $true; break }
    Start-Sleep 2
}
if (-not $ready) { Rollback 'gateway did not become ready within 120s' }
# container env carries the new keys
$envL1 = ((docker exec $NAME printenv MUSE_LEVEL_1_KEY) | Out-String).Trim()
$envL2 = ((docker exec $NAME printenv MUSE_LEVEL_2_KEY) | Out-String).Trim()
if (($envL1 -ne $newL1) -or ($envL2 -ne $newL2)) { Rollback 'new container env does not carry the new keys' }
Status 'gateway ready; container env verified'

# ---------- 8. smoke suite ----------
# DOCUMENT_OBSERVED is registry-valid but has no bridge/worker subscribers,
# so the smoke POST persists without triggering downstream pipelines.
$ev1 = '{"event_type":"DOCUMENT_OBSERVED","aggregate_id":"key-rotation-2026-09-13-l1","aggregate_type":"ops","event_data":{"note":"credential rotation smoke test","check":"l1-post-events"}}'
$ev2 = '{"event_type":"DOCUMENT_OBSERVED","aggregate_id":"key-rotation-2026-09-13-l2","aggregate_type":"ops","event_data":{"note":"credential rotation smoke test","check":"l2-post-events"}}'
$missionBody = '{"type":"ROTATION_SMOKE_TEST","description":"credential rotation smoke test mission"}'

$checks = @(
    @('unauth GET /orchestration/engine',        (HttpCode 'GET'  ($BASE + '/orchestration/engine')   $null          $null),         401),
    @('L1 GET /orchestration/engine',            (HttpCode 'GET'  ($BASE + '/orchestration/engine')   $newL1         $null),         200),
    @('L1 POST /orchestration/missions',        (HttpCode 'POST' ($BASE + '/orchestration/missions') $newL1         '{}'),          403),
    @('L2 POST /orchestration/missions',        (HttpCode 'POST' ($BASE + '/orchestration/missions') $newL2         $missionBody),  201),
    @('unauth POST /events',                    (HttpCode 'POST' ($BASE + '/events')                  $null          $ev1),          401),
    @('L1 POST /events',                        (HttpCode 'POST' ($BASE + '/events')                  $newL1         $ev1),          200),
    @('L2 POST /events',                        (HttpCode 'POST' ($BASE + '/events')                  $newL2         $ev2),          200),
    @('old L1 key rejected',                    (HttpCode 'GET'  ($BASE + '/orchestration/engine')   $script:oldL1  $null),         401),
    @('old L2 key rejected',                    (HttpCode 'GET'  ($BASE + '/orchestration/engine')   $script:oldL2  $null),         401)
)
$allOk = $true
foreach ($ch in $checks) {
    $ok = ($ch[1] -eq $ch[2])
    if (-not $ok) { $allOk = $false }
    Status (($ch[0] + ' => got ' + $ch[1] + ' expect ' + $ch[2] + ' ' + $(if ($ok) { 'PASS' } else { 'FAIL' })))
}
if (-not $allOk) { Rollback 'one or more smoke checks failed' }

$finalImg = (docker inspect $NAME --format '{{.Config.Image}}' | Out-String).Trim()
Status ("RESULT=OK image=" + $finalImg + " rollback_container=" + $PREV2)
Write-Output '[rotate] RESULT=OK'
