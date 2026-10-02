cd /home/nolan/projects/ping
grep -rln "ClaimBadge\|claimBadge" src/fyd --include="*.test.ts" --include="*.test.tsx"
echo === 
grep -n "ClaimBadge" src/fyd/boundary/__tests__/projection-seam-attack.test.ts src/fyd/components/__tests__/projection-boundary.test.ts 2>/dev/null | head
