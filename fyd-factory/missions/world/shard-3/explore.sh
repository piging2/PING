#!/bin/bash
# WORLD-SHARD-3 exploration: repo API surface + saturation check
cd /home/nolan/projects/ping
echo "=== load ==="; uptime; echo "=== nproc ==="; nproc
echo "=== branch/head/dirty ==="; git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD; git status --short | wc -l
echo "=== fyd dirs ==="; ls src/fyd 2>/dev/null
echo "=== buildRenderContext ==="; grep -rn "export function buildRenderContext\|export async function buildRenderContext\|export const buildRenderContext" src --include="*.ts" --include="*.tsx" | head
echo "=== generateSiteSpec ==="; grep -rln "generateSiteSpec" src --include="*.ts" | grep -v test | head
echo "=== validateSiteSpec ==="; grep -rln "validateSiteSpec" src --include="*.ts" | grep -v test | head
echo "=== tsx ==="; ls node_modules/.bin/tsx 2>/dev/null; node --version
