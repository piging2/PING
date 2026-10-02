cd /home/nolan/projects/ping
echo "===== propose.ts ====="
cat src/fyd/customize/propose.ts
echo ""
echo "===== patch.ts SiteIntent (grep) ====="
grep -n "SiteIntent\|export type\|kind:" src/fyd/proceduralize/patch.ts | head -50
