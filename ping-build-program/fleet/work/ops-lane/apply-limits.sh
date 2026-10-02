#!/bin/bash
set -u
CF=/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml
cp "$CF" "$CF.ops-lane-bak"
python3 - "$CF" << 'PYEOF'
import sys, re
p = sys.argv[1]
s = open(p).read()
# add mem limits to postgres, qdrant, gateway services (insert after container_name line)
for svc, cname in [("postgres","ping-postgres"),("qdrant","ping-qdrant"),("gateway","ping-gateway")]:
    pat = re.compile(r"(    container_name: %s\n)" % cname)
    add = "    mem_limit: 1g\n    memswap_limit: 1g\n"
    s2, n = pat.subn(r"\1" + add, s, count=1)
    assert n == 1, f"pattern failed for {cname}"
    s = s2
open(p,'w').write(s)
print("compose file updated")
PYEOF
grep -n -A2 "container_name: ping-" "$CF" | grep -e mem_limit -e memswap_limit -e container_name
echo "=== live update postgres+qdrant (no restart) ==="
docker update --memory 1g --memory-swap 1g ping-postgres ping-qdrant
echo "update_exit=$?"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'
