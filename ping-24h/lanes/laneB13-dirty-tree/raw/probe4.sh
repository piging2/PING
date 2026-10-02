cd /home/nolan/projects/ping || exit 1
for f in src/app/api/mc/_lib/mc-dispatch-identity.ts src/app/api/mc/_lib/mc-tenant-gate.ts src/lib/ping/digest.ts; do
  echo "########## $f (head -40)"
  head -40 "$f"
done
echo "=== digest sha256Hex export ==="
grep -n "sha256Hex\|export function\|export const" src/lib/ping/digest.ts | head -20
