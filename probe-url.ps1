param([string]$Url)
try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 $Url).StatusCode } catch { 'UNREACHABLE' }
