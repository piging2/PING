cd /home/nolan/projects/ping
echo "=== safe-link.ts ==="
sed -n '1,140p' src/fyd/sitespec/safe-link.ts
echo "=== renderer.tsx DisplayMedia/img context ==="
grep -n "DisplayMedia\|<img" src/fyd/components/renderer.tsx | head -20
