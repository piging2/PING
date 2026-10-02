cd /home/nolan/projects/ping-constitutional
echo "===== H1: claim identity bridge ====="
sed -n '1,80p' src/fyd/claim/identity.ts
echo "===== H2: practice session identity ====="
grep -n "getPracticeIdentityId\|cookie\|sign\|verify" src/lib/ping/session.ts | head -30
echo "===== H3: password comparison anywhere ====="
grep -rEn --include='*.ts' --include='*.tsx' "timingSafeEqual|password ===|=== password|compareSync|bcrypt" src | head -20
echo "===== H4: resources/download route (traversal?) ====="
sed -n '1,60p' src/app/api/resources/download/route.ts
echo "===== H5: diagnostics/sharp route ====="
sed -n '1,50p' src/app/api/diagnostics/sharp/route.ts
echo "===== H6: ping feed/proposal/ask mutations ====="
for f in src/app/api/ping/feed/route.ts src/app/api/ping/proposal/route.ts src/app/api/ping/ask/route.ts "src/app/api/fyd/ask/[siteId]/route.ts"; do echo "--- $f ---"; grep -n "export async function\|401\|403\|session\|verify\|sign" "$f" | head -10; done
