#!/bin/bash
cd /home/nolan/ping
echo "=== execution_authority.py: class + methods + docstring ==="
sed -n '1,100p' runtime/authorities/execution_authority.py
echo "=== who imports execution_authority (python) ==="
grep -rln "execution_authority\|ExecutionAuthority" --include="*.py" runtime agents workers cron 2>/dev/null | head -20
