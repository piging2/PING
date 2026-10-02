#!/bin/bash
# READ-ONLY pass 5. NAMES + LITERAL/INTERPOLATED flags only; values never printed.
set -u
echo "=== vault service env in /mnt/c/Users/nolan/PING/docker-compose.yml (NAME + flag only) ==="
python3 -c "
import re
text=open('/mnt/c/Users/nolan/PING/docker-compose.yml').read()
lines=text.split('\n')
in_vault=False; in_env=False
for l in lines:
    if re.match(r'^  vault:', l): in_vault=True; continue
    if in_vault and re.match(r'^  [a-zA-Z]', l): break
    if in_vault and re.match(r'^    environment:', l): in_env=True; continue
    if in_vault and in_env and re.match(r'^    [a-zA-Z]', l): in_env=False; continue
    if in_vault and in_env:
        m=re.match(r'^\s+-?\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:=]', l)
        if m:
            tag='INTERPOLATED' if ('\${' in l or re.search(r'\$[A-Za-z_]', l)) else 'LITERAL-VALUE-IN-FILE'
            print(m.group(1), '::', tag)
" 2>&1 | head -15
echo
echo "=== secret-ish env assignments across whole docker-compose.yml (NAME + flag only) ==="
grep -nE '^\s+-?\s*[A-Za-z_][A-Za-z0-9_]*\s*[:=]' /mnt/c/Users/nolan/PING/docker-compose.yml 2>/dev/null | grep -iE 'pass|secret|token|key|cred|auth|bearer' | while IFS=: read -r ln rest; do
  name=$(echo "$rest" | sed -E 's/^\s*-?\s*([A-Za-z_][A-Za-z0-9_]*).*/\1/')
  if echo "$rest" | grep -qE '\$\{|\$[A-Za-z_]'; then tag=INTERPOLATED; else tag=LITERAL-VALUE-IN-FILE; fi
  echo "line $ln :: $name :: $tag"
done | head -25
echo
echo "=== which env_file does the ping compose project use (paths only) ==="
grep -n -B2 -A4 'env_file' /mnt/c/Users/nolan/PING/docker-compose.yml 2>/dev/null | grep -oE '\./[^ ]+|\.\./[^ ]+|/[^ ]+\.env[^ :]*' | sort -u | head
