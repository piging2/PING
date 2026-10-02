cd /home/nolan/projects/ping
echo "=== demo-classification test head ==="
sed -n '1,60p' src/fyd/ask/__tests__/demo-classification.test.ts
echo "=== (970) 555 numbers in fixtures ==="
grep -rho '(970) 555-[0-9]*\|970-555-[0-9]*\|+1970555[0-9]*' src/fyd --include='*.ts' | sort -u | head -40
