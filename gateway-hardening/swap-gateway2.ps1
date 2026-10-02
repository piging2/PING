# swap-gateway2.ps1 — complete the swap after the first attempt stopped/renamed
# the live container but failed to start the new one (image name missing from args).
# Config source: ping-gateway if present, else ping-gateway-prev (stopped).
# Bearer keys are re-applied from the source container's env in memory only.
$ErrorActionPreference = 'Stop'
$Image = 'curious-squid-gateway:phase4-eventauth8'

$srcId = (docker ps -aq --filter "name=^/ping-gateway$" | Select-Object -First 1)
if ($srcId) { $srcName = 'ping-gateway' } else {
  $srcId = (docker ps -aq --filter "name=^/ping-gateway-prev$" | Select-Object -First 1)
  if (-not $srcId) { throw 'neither ping-gateway nor ping-gateway-prev exists; nothing to base config on' }
  $srcName = 'ping-gateway-prev'
}
$live = (docker inspect $srcId | ConvertFrom-Json)[0]
Write-Host "Config source: $srcName ($srcId)"

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

# Ensure no half-created ping-gateway exists from the failed attempt
$existing = (docker ps -aq --filter "name=^/ping-gateway$" | Select-Object -First 1)
if ($existing) {
  Write-Host "Removing half-created container $existing"
  docker rm -f $existing | Out-Null
}

Write-Host "Starting $Image as ping-gateway..."
$runArgs = @('run', '-d', '--name', 'ping-gateway', '--restart', $restartName) +
  $portArgs + $volArgs + $envArgs +
  @('--entrypoint', $entrypoint, $Image) + $cmd
& docker @runArgs | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker run failed' }

$newId = (docker ps -q --filter "name=^/ping-gateway$" | Select-Object -First 1).Trim()
$newImage = docker inspect $newId --format '{{.Config.Image}}'
Write-Host "New container: $newId image=$newImage"
if ($newImage -notlike '*phase4-eventauth8*') { throw 'New container is not running the eventauth8 image' }
Write-Host 'SWAP OK'
