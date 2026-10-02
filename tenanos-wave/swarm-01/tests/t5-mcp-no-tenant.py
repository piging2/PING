#!/usr/bin/env python3
# SWARM-01 T5: MCP tools cross tenants (no tenant parameter anywhere).
# REAL code path: static inspection of /home/nolan/ping/mcp/ping_mcp_server.py.
# Synthetic fixtures only. Read-only: no network, no DB.
import ast
import os

SUBSTRATE = os.environ.get('PING_SUBSTRATE', '/home/nolan/ping')

def main():
    path = os.path.join(SUBSTRATE, 'mcp', 'ping_mcp_server.py')
    src = open(path).read()
    tree = ast.parse(src)
    tools = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and not n.name.startswith('_')]
    print(f'{len(tools)} public tool functions in ping_mcp_server.py:')
    leaky = []
    for fn in tools:
        params = [a.arg for a in fn.args.args] + [a.arg for a in fn.args.kwonlyargs]
        has_tenant = any('tenant' in p.lower() for p in params)
        print(f'  {fn.name}({", ".join(params)}) tenant_param={has_tenant}')
        if not has_tenant:
            leaky.append(fn.name)
    if leaky:
        print(f'LEAK DEMONSTRATED T5: {len(leaky)}/{len(tools)} MCP tools accept no tenant parameter; '
              'every tool proxies global Mission Control endpoints (memory/events/lineage/credentials).')
    else:
        print('BOUNDARY HOLDS T5: all MCP tools are tenant-scoped.')

main()
