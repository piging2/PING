echo "=== files containing fffe99f7a on the Pig (runbooks/logs) ==="
grep -rl "fffe99f7a" /home/nolan --include="*.sh" --include="*.md" --include="*.json" --include="*.yaml" --include="*.txt" 2>/dev/null | grep -v node_modules | head -20
echo "=== candidate in docker ==="
docker images --filter reference='ping-gateway*' --format '{{.Repository}}:{{.Tag}}|{{.CreatedSince}}|{{.ID}}'
