# swap-gateway.ps1 — swap ping-gateway to curious-squid-gateway:phase4-eventauth8.
# Derives the live container config via docker inspect at runtime (env, ports,
# volumes, restart policy, entrypoint, cmd). Bearer keys are re-applied from the
# live container's env in memory only: never printed, logged, or written to disk.
$ErrorActionPreference = 'Stop'

$liveId = (docker ps -q --filter "name=^/ping-gateway$" | Select-Object -First 1).Trim()
if (-not $liveId) { throw 'ping-gateway is not running; refusing to swap' }
$live = (docker inspect $liveId | ConvertFrom-Json)[0]
Write-Host "Live container: $liveId"

$envArgs = @()
foreach ($e in $live.Config.Env) { $envArgs += '-e'; $envArgs += $e }
$portArgs = @()
foreach ($prop in $live.HostConfig.PortBindings.PSObject.Properties) {
  $containerPort = $prop.Name.Split('/')[0]
  foreach ($b in $prop.Value) { $portArgs += '-p'; $portArgs += "$($b.HostPort):$containerPort" }
}
$volArgs = @()
foreach ($b in $live.HostConfig.Binds) { $volArgs += '-v'; $volArgs += $b }
$restartName = $live.HostConfig.RestartPolicy.Name
$entrypoint = $live.Config.Entrypoint[0]
$cmd = $live.Config.Cmd
Write-Host "Config: restart=$restartName entrypoint=$entrypoint cmd='$($cmd -join ' ')' ports='$($portArgs -join ' ')' vols='$($volArgs -join ' ')' env_count=$($live.Config.Env.Count)"

docker rm ping-gateway-prev 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Host 'Removed stale ping-gateway-prev' }

Write-Host 'Stopping ping-gateway...'
docker stop $liveId | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker stop failed' }

Write-Host 'Renaming live container to ping-gateway-prev...'
docker rename $liveId ping-gateway-prev | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker rename failed' }

Write-Host 'Starting curious-squid-gateway:phase4-eventauth8 as ping-gateway...'
$runArgs = @('run', '-d', '--name', 'ping-gateway', '--restart', $restartName) +
  $portArgs + $volArgs + $envArgs +
  @('--entrypoint', $entrypoint) + $cmd
& docker @runArgs | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker run failed' }

$newId = (docker ps -q --filter "name=^/ping-gateway$" | Select-Object -First 1).Trim()
$newImage = docker inspect $newId --format '{{.Config.Image}}'
Write-Host "New container: $newId image=$newImage"
if ($newImage -notlike '*phase4-eventauth8*') { throw 'New container is not running the eventauth8 image' }
Write-Host 'SWAP OK'
