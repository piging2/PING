powershell.exe -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://127.0.0.1:3100/sites/coppersmith-plumbing).StatusCode } catch { 'UNREACHABLE' }"
