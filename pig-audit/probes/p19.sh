#!/bin/bash
cd /home/nolan/ping
echo "=== docker-compose services/ports ==="
grep -nE "^  [a-z]|image:|ports:|container_name:|POSTGRES_DB|DATABASE_URL" docker-compose.yml | head -40
echo "=== auth middleware: where is Bearer enforced (search whole gateway) ==="
grep -rln "authorization\|Authorization" --include="*.js" gateway | grep -v node_modules | grep -vE "generated|verify" | head -10
