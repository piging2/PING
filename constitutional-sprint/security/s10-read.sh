cd /home/nolan/projects/ping-constitutional
echo "===== I1: sharp route GET handler auth ====="
grep -n "export async function GET\|auth\|401\|403\|requireAuth\|getSession\|verify" src/app/api/diagnostics/sharp/route.ts | head -15
echo "===== I2: ping-object-reader visibility enforcement ====="
grep -n "async getObject\|async getNode\|visibility\|private\|controller\|viewerId" src/lib/ping/ping-object-reader.ts | head -40
echo "===== I3: session.ts cookie verification ====="
sed -n '1,60p' src/lib/ping/session.ts
echo "===== I4: workbench routes ====="
find src/app -path '*workbench*' | head; grep -rln --include='*.tsx' -i "workbench" src/app | head
echo "===== I5: fyd ask siteId route POST auth ====="
sed -n '25,90p' "src/app/api/fyd/ask/[siteId]/route.ts"
