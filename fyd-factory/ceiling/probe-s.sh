#!/bin/bash
# F5-CEILING probe S: resolveQuery definition
set -e
cd /home/nolan/projects/ping
grep -rn "export function resolveQuery\|function resolveQuery" src/fyd --include="*.ts" | grep -v __tests__ | head
