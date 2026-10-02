cd /home/nolan/projects/ping
grep -n 'article\|project' src/fyd/sitespec/schemas.ts | head -20
echo "=== project predicate ==="
grep -rhoE '"[a-z_]+"' src/fyd/sitespec/schemas.ts | sort -u | head -30
