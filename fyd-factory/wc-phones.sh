cd /home/nolan/projects/ping
grep -rhoE '\+1?97055501[0-9]{2}|\(970\) ?555-01[0-9]{2}|970-555-01[0-9]{2}' src/fyd src/lib/ping --include='*.ts' --include='*.tsx' --include='*.json' 2>/dev/null | sort | uniq -c | sort -rn | head -40
echo "=== files with those ==="
grep -rloE '\+1?97055501[0-9]{2}|\(970\) ?555-01[0-9]{2}|970-555-01[0-9]{2}' src/fyd src/lib/ping --include='*.ts' --include='*.tsx' --include='*.json' 2>/dev/null | head -20
