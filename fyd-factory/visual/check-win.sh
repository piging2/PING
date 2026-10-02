#!/bin/bash
echo "--- win 127.0.0.1:3100/sites/happy-place via powershell:"
powershell.exe -NoProfile -Command "(Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 http://127.0.0.1:3100/sites/happy-place).StatusCode" 2>&1 | tail -2
echo "--- node on windows:"
cmd.exe /c "where node" 2>&1 | head -3
echo "--- node version:"
cmd.exe /c "node --version" 2>&1 | head -2
