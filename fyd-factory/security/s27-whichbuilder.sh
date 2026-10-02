#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== which builder does the real build route use? ==="
grep -n 'generateSiteSpec\|planner\|plan(' src/app/build/\[siteId\]/page.tsx | head -10
echo "=== generator.ts vs planner.ts entry ==="
grep -n 'export function' src/fyd/proceduralize/generator.ts | head -5
grep -n 'export function plan\|export async function plan' src/fyd/builder/planner.ts | head -5
