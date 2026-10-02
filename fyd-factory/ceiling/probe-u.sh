#!/bin/bash
# F5-CEILING probe U: renderer resolveQuery - does it handle "reference"?
set -e
cd /home/nolan/projects/ping
grep -n -A40 "export function resolveQuery" src/fyd/components/renderer.tsx | head -60
