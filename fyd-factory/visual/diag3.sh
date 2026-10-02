#!/bin/bash
powershell.exe -NoProfile -Command "
try {
  \$r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://127.0.0.1:3100/sites/happy-place
  'STATUS ' + \$r.StatusCode + ' LEN ' + \$r.RawContentLength
} catch { 'ERR1 ' + \$_.Exception.Message }
try {
  \$r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://localhost:3100/sites/happy-place
  'STATUS ' + \$r.StatusCode + ' LEN ' + \$r.RawContentLength
} catch { 'ERR2 ' + \$_.Exception.Message }
'PROXY_HTTP=' + \$env:HTTP_PROXY
" < /dev/null > /mnt/c/Users/nolan/transfer/diag1.log 2>&1
echo "--- log:"
cat /mnt/c/Users/nolan/transfer/diag1.log
echo "--- end log"
