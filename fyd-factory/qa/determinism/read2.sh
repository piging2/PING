#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== search render entry points ==="
grep -rln "renderToString\|renderToStaticMarkup" src/fyd --include="*.ts*" | head -10
echo "---"
grep -rn "export function render\|export const render\|export function build\|export async function render" src/fyd --include="*.ts" --include="*.tsx" | grep -vi test | head -30
echo "=== planner.ts head ==="
head -80 src/fyd/builder/planner.ts
