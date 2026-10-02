cd /home/nolan/projects/ping-constitutional
echo "===== G1: likes storage backend ====="
sed -n '1,60p' src/fyd/object/likes.ts
echo "===== G2: kit webhook route (FULL) ====="
cat src/app/api/kit/webhook/route.ts
echo "===== G3: workbench password consumers ====="
grep -rEn --include='*.ts' --include='*.tsx' "WORKBENCH_PASSWORD" src | head -20
echo "===== G4: claims identity + claim/release/verify routes (auth lines) ====="
for f in src/app/api/fyd/claims/identity/route.ts "src/app/api/fyd/claims/[resourceId]/claim/route.ts" "src/app/api/fyd/claims/[resourceId]/release/route.ts" "src/app/api/fyd/claims/[resourceId]/verify/route.ts" src/app/api/ping/actions/route.ts; do
  echo "--- $f ---"; sed -n '1,50p' "$f" | grep -n "import\|auth\|401\|403\|session\|sign\|verify\|export async" | head -20
done
