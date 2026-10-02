cd /home/nolan/projects/ping-constitutional
echo "===== J1: sharp expectedAuth source (name only) ====="
sed -n '130,155p' src/app/api/diagnostics/sharp/route.ts | sed 's/=.*$/= <VALUE-OMITTED>/'
echo "===== J2: practice session route ====="
cat src/app/api/practice/session/route.ts
echo "===== J3: setPracticeIdentityId callers ====="
grep -rEn --include='*.ts' --include='*.tsx' "setPracticeIdentityId" src | head
echo "===== J4: logEvent write destination ====="
grep -n "export function logEvent\|export async function logEvent" src/lib/events.ts | head -3
grep -n "writeFile\|appendFile\|data/\|EVENTS\|journal" src/lib/events.ts | head -20
