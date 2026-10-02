cd /home/nolan/projects/ping
echo "=== DEMO_SYNTHETIC ==="
grep -rl 'DEMO_SYNTHETIC' --include='*.ts' --include='*.json' . 2>/dev/null | grep -v node_modules | head
echo "=== redacted ==="
grep -rli 'redacted' --include='*.ts' --include='*.json' --include='*.md' . 2>/dev/null | grep -v node_modules | head
echo "=== PingObject type ==="
sed -n '1,120p' src/lib/ping/types.ts
