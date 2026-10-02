cd /home/nolan/projects/ping
echo "=== PingRelationship ==="
grep -n 'interface PingRelationship' -A 20 src/lib/ping/types.ts
echo "=== DEMO_SYNTHETIC usage ==="
grep -n 'DEMO_SYNTHETIC' -B4 -A8 src/lib/ping/ask-composer.ts | head -60
echo "=== sitespec ObjectGraph ==="
grep -n 'ObjectGraph' -B2 -A20 src/fyd/sitespec/types.ts | head -60
