cd /home/nolan/projects/ping-constitutional
echo "===== R1: customize route auth gates ====="
grep -n "isPrivateHost\|isDemoOwnerModeEnabled\|unauthorized\|401\|403" src/app/api/fyd/customize/route.ts | head -20
echo "===== R2: object GET routes: projection/visibility filtering ====="
for f in src/app/api/ping/object/route.ts src/app/api/ping/node/route.ts src/app/api/fyd/objects/\[objectId\]/route.ts src/app/api/fyd/projection/route.ts src/app/api/fyd/social/feed/route.ts src/app/api/fyd/social/state/route.ts; do
  echo "--- $f ---"
  grep -n "NextResponse.json\|Response.json\|visibility\|project\|filter\|unauthorized\|401\|403\|getSession\|requireAuth\|verify" "$f" 2>/dev/null | head -15
done
echo "===== R3: mutation routes: like/follow/overrides/claims ====="
for f in src/app/api/fyd/like/route.ts src/app/api/fyd/follow/route.ts "src/app/api/fyd/objects/[objectId]/overrides/route.ts" src/app/api/fyd/claims/identity/route.ts src/app/api/ping/actions/route.ts src/app/api/fyd/social/post/route.ts; do
  echo "--- $f ---"
  grep -n "isPrivateHost\|isDemoOwnerModeEnabled\|unauthorized\|401\|403\|getSession\|requireAuth\|verify\|signed\|signature" "$f" 2>/dev/null | head -12
done
echo "===== R4: kit webhook secret verification ====="
grep -n "KIT_WEBHOOK_SECRET\|verify\|signature\|hmac\|timingSafe" src/app/api/kit/webhook/route.ts | head -15
echo "===== R5: workbench password check ====="
grep -rln --include='*.ts' "WORKBENCH_PASSWORD" src | head
