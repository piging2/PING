# log-recon.ps1 — counts only, no secret-bearing output.
$logs = docker logs ping-gateway 2>&1 | Out-String
$checks = @(
  @{ name = 'ExteriorAuth Postgres backing'; pattern = 'Initialized with Postgres backing' },
  @{ name = 'ExteriorAuth degraded in-memory'; pattern = 'in-memory degraded mode' },
  @{ name = 'EventBridge poll cycle complete'; pattern = 'Poll cycle complete' },
  @{ name = 'EventBridge errors nonzero'; pattern = 'errors=[1-9]' },
  @{ name = 'orchestration mount'; pattern = 'orchestration' },
  @{ name = 'route errors'; pattern = 'ROUTE ERROR' },
  @{ name = 'unhandled/exception'; pattern = 'Unhandled|Uncaught|FATAL' }
)
foreach ($c in $checks) {
  $n = ([regex]::Matches($logs, $c.pattern)).Count
  Write-Host "$($c.name): $n"
}
