WSLIP=$(hostname -I | awk '{print $1}')
echo "wsl ip: $WSLIP"
powershell.exe -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://$WSLIP`:3100/sites/coppersmith-plumbing).StatusCode } catch { 'UNREACHABLE' }"
