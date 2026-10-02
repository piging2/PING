#!/bin/bash
# READ-ONLY pass 2. Names/flags/counts only; no values printed.
set -u
echo "=== key NAMES in /opt/ping/.env (names only) ==="
cut -d= -f1 /opt/ping/.env 2>/dev/null | sort
echo
echo "=== key NAMES in /opt/ping/infrastructure/oracle/.env (names only) ==="
cut -d= -f1 /opt/ping/infrastructure/oracle/.env 2>/dev/null | sort
echo
echo "=== duplicate check: keys in BOTH .env files ==="
comm -12 <(cut -d= -f1 /opt/ping/.env 2>/dev/null | sort -u) <(cut -d= -f1 /opt/ping/infrastructure/oracle/.env 2>/dev/null | sort -u)
echo "(end duplicate list)"
echo
echo "=== which .env files are REFERENCED by compose configs (grep for env_file lines, values never printed) ==="
grep -rn --include='docker-compose*.yml' -E 'env_file' /opt/ping/releases /opt/ping/infrastructure 2>/dev/null | head -20
echo
echo "=== environment: blocks in the live compose file (KEY names + LITERAL/INTERPOLATED flags only) ==="
for f in /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml; do
  echo "--- $f ---"
  python3 - "$f" << 'PYEOF' 2>/dev/null || echo "(python3 unavailable or parse failed)"
import sys, re
text = open(sys.argv[1]).read()
# list-style: - KEY=value ; mapping-style: KEY: value (indented under environment:)
for m in re.finditer(r'^\s*-\s*([A-Za-z_][A-Za-z0-9_]*)\s*=', text, re.M):
    v = text[m.end():m.end()+40]
    tag = "INTERPOLATED" if ("${" in v or re.match(r'\$[A-Za-z_]', v)) else "LITERAL-VALUE-PRESENT"
    if re.search(r'pass|secret|token|key|cred|auth|bearer', m.group(1), re.I):
        print(m.group(1), "::", tag, "(list-style)")
seen=set()
for m in re.finditer(r'^(\s+)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(\S.*)$', text, re.M):
    k=m.group(2); v=m.group(3).strip()
    if re.search(r'pass|secret|token|key|cred|auth|bearer', k, re.I) and k not in seen:
        seen.add(k)
        tag="INTERPOLATED" if ("${" in v or re.match(r'\$[A-Za-z_]', v)) else "LITERAL-VALUE-PRESENT"
        print(k, "::", tag, "(mapping-style)")
PYEOF
done
echo
echo "=== root_private_key.pem: perms + size only ==="
stat -c '%a %s %n' /opt/ping/gateway/root_private_key.pem 2>/dev/null
echo "=== pgpass dir inside node_modules: names only ==="
ls -la /opt/ping/gateway/node_modules/pgpass 2>/dev/null | awk '{print $1, $NF}' | head -10
echo
echo "=== docker inspect: Cmd/Entrypoint of ping-gateway (check for inline secrets in command line) ==="
docker inspect ping-gateway --format 'Cmd: {{json .Config.Cmd}} Entrypoint: {{json .Config.Entrypoint}}' 2>/dev/null
echo
echo "=== /opt/ping/.env perms+mtime (rotation evidence) ==="
stat -c '%a %y %n' /opt/ping/.env /opt/ping/.env.bak-20260921-p0rotate /opt/ping/.env.bak-20260917 /opt/ping/infrastructure/oracle/.env 2>/dev/null
