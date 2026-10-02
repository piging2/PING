#!/usr/bin/env python3
"""Add mem_limit/memswap_limit (1g) to postgres, qdrant, gateway services.
Idempotent: skips any service block that already declares mem_limit.
Operates on the converged Pig worktree compose copy."""
import re
import sys

PATH = "/home/nolan/ping/worktrees/oracle-assembly/infrastructure/oracle/docker-compose.oracle.yml"
TARGETS = {"postgres", "qdrant", "gateway"}

with open(PATH, encoding="utf-8") as f:
    lines = f.readlines()

out = []
service = None
in_services = False
block_has_mem = False
changed = []

for i, line in enumerate(lines):
    m_svc = re.match(r"^  (\w[\w-]*):\s*$", line)
    if line.startswith("services:"):
        in_services = True
    if in_services and m_svc:
        service = m_svc.group(1)
        block_has_mem = False
    if in_services and service in TARGETS and "mem_limit" in line:
        block_has_mem = True
    out.append(line)
    if (in_services and service in TARGETS and not block_has_mem
            and re.match(r"^    restart:\s+unless-stopped\s*$", line)):
        out.append("    mem_limit: 1g\n")
        out.append("    memswap_limit: 1g\n")
        changed.append(service)
        block_has_mem = True  # avoid double insert within this block

with open(PATH, "w", encoding="utf-8") as f:
    f.writelines(out)

print("changed services: %s" % (changed if changed else "none (already present)"))
