#!/bin/bash
echo "=== build-patched.mjs ==="
cat /home/nolan/fyd-factory-shard2/build-patched.mjs 2>/dev/null | head -60
echo "=== registry.ts imports (patched tree) ==="
grep -e '^import' /home/nolan/projects/ping/src/fyd/components/registry.ts | head
echo "=== schema-roles leaf exists? ==="
ls /home/nolan/projects/ping/src/fyd/sitespec/schema-roles.ts 2>/dev/null || echo "no leaf"
ls /home/nolan/fyd-wave2-clean/src/fyd/sitespec/schema-roles.ts 2>/dev/null || echo "no leaf in clean tree"
echo "=== registry.ts imports (clean tree) ==="
grep -e '^import' /home/nolan/fyd-wave2-clean/src/fyd/components/registry.ts | head
